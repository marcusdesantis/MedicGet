/**
 * PaymentsHistoryTable — tabla reutilizable de historial de pagos.
 *
 * Se monta en /admin/payments, /doctor/payments y /clinic/payments.
 * El backend devuelve los pagos filtrados según el JWT del caller
 * (admin = todos, doctor = los suyos, etc.), por lo que la UI es la
 * misma — el componente solo renderiza lo que recibe.
 *
 *   <PaymentsHistoryTable />
 *
 * Soporta filtro por estado y descarga de recibo individual.
 */

import { useEffect, useMemo, useState } from 'react';
import { Download, Receipt, Filter, Loader2, Search } from 'lucide-react';
import { useApi }       from '@/hooks/useApi';
import { SectionCard }  from '@/components/ui/SectionCard';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { EmptyState }   from '@/components/ui/EmptyState';
import { Alert }        from '@/components/ui/Alert';
import { Avatar }       from '@/components/ui/Avatar';
import { matchesSearch } from '@/lib/search';
import { paymentApi, TOKEN_KEY, type PaymentRowDto, type PaginatedData } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: '',         label: 'Todos los estados' },
  { value: 'PAID',     label: 'Pagados'           },
  { value: 'REFUNDED', label: 'Reembolsados'      },
  { value: 'PENDING',  label: 'Pendientes'        },
  { value: 'FAILED',   label: 'Fallidos'          },
];

const STATUS_MAP = {
  paid:     { label: 'Pagado',      bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  refunded: { label: 'Reembolsado', bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-300'     },
  pending:  { label: 'Pendiente',   bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-700 dark:text-slate-300'     },
  failed:   { label: 'Fallido',     bg: 'bg-rose-100 dark:bg-rose-900/30',       text: 'text-rose-700 dark:text-rose-300'       },
};

/**
 * Abre el recibo HTML en una pestaña nueva. Usa fetch + Blob para
 * preservar el Authorization header (un `<a href>` directo no lo manda).
 */
async function openReceipt(paymentId: string): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(paymentApi.receiptUrl(paymentId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // Liberar la URL después de unos segundos (ya cargó el contenido).
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[receipt] failed:', err);
    alert('No se pudo abrir el recibo. Intentá de nuevo.');
  }
}

export function PaymentsHistoryTable() {
  const [status, setStatus]   = useState<string>('');
  const [search, setSearch]   = useState<string>('');
  // Debounce del input — evita disparar refetch en cada tecla.
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const { state, refetch } = useApi<PaginatedData<PaymentRowDto>>(
    () => paymentApi.list({ status: status || undefined, pageSize: 200 }),
    [status],
  );

  /**
   * Filtramos en cliente por nombre/email de paciente o médico/clínica.
   * El listado completo lo trae el backend (200 rows max); el search
   * en cliente es suficiente porque el admin típicamente no maneja
   * más de eso. Si en el futuro crece, agregamos `search` al endpoint.
   */
  const rows = useMemo(() => {
    if (state.status !== 'ready') return [];
    const all = state.data.data;
    if (!debouncedSearch.trim()) return all;
    return all.filter((p) => {
      const pat = p.appointment.patient;
      const doc = p.appointment.doctor;
      return matchesSearch(
        debouncedSearch,
        pat.user.email,
        pat.user.profile?.firstName,
        pat.user.profile?.lastName,
        doc.user.profile?.firstName,
        doc.user.profile?.lastName,
        doc.specialty,
        p.appointment.clinic?.name,
        p.transactionId,
      );
    });
  }, [state, debouncedSearch]);

  const totalShown = rows.length;
  const totalAll   = state.status === 'ready' ? state.data.meta.total : 0;

  return (
    <SectionCard noPadding>
      {/* Filtros + buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        {/* Buscador por paciente / médico / clínica / transacción */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente, médico, clínica o transacción…"
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter size={14} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-400 sm:ml-auto whitespace-nowrap">
          {state.status === 'ready'
            ? debouncedSearch.trim()
              ? `${totalShown} de ${totalAll} pago${totalAll === 1 ? '' : 's'}`
              : `${totalAll} pago${totalAll === 1 ? '' : 's'}`
            : '—'}
        </p>
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}
      {state.status === 'error' && (
        <div className="p-6">
          <Alert variant="error" action={
            <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
          }>
            {state.error.message}
          </Alert>
        </div>
      )}
      {state.status === 'ready' && rows.length === 0 && (
        <EmptyState
          title={debouncedSearch.trim() || status ? 'Sin coincidencias' : 'Sin pagos para mostrar'}
          description={
            debouncedSearch.trim()
              ? `No encontramos pagos para "${debouncedSearch}". Probá con otro término.`
              : status
                ? 'Probá cambiar el filtro de estado.'
                : 'Cuando los pacientes paguen sus citas, los registros aparecerán acá.'
          }
          icon={Receipt}
        />
      )}

      {state.status === 'ready' && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Fecha pago</th>
                <th className="text-left px-5 py-3">Paciente</th>
                <th className="text-left px-5 py-3">Médico</th>
                <th className="text-left px-5 py-3">Cita</th>
                <th className="text-right px-5 py-3">Monto</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-right px-5 py-3">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((p) => {
                const patient = p.appointment.patient.user.profile;
                const doctor  = p.appointment.doctor.user.profile;
                const initials = ((patient?.firstName?.[0] ?? '') + (patient?.lastName?.[0] ?? '')).toUpperCase() || '··';
                const paidAt = p.paidAt
                  ? new Date(p.paidAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                const apptDate = new Date(p.appointment.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{paidAt}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initials} size="sm" variant="auto" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white truncate">
                            {patient?.firstName} {patient?.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{p.appointment.patient.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      Dr. {doctor?.firstName} {doctor?.lastName}
                      <p className="text-[11px] text-slate-400">{p.appointment.doctor.specialty}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {apptDate} · {p.appointment.time}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-white">${p.amount.toFixed(2)}</span>
                      {p.platformFee != null && (
                        <p className="text-[11px] text-slate-400">
                          comisión ${p.platformFee.toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={p.status.toLowerCase()}
                        statusMap={STATUS_MAP}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openReceipt(p.id)}
                        disabled={p.status !== 'PAID' && p.status !== 'REFUNDED'}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Abrir recibo (imprimir o guardar como PDF)"
                      >
                        <Download size={13} /> Recibo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
