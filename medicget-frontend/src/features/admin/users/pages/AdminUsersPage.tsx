import { useState } from 'react';
import { Loader2, Ban, Trash2, RotateCcw, Search } from 'lucide-react';
import { toast }         from 'sonner';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { Alert }         from '@/components/ui/Alert';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { useApi }        from '@/hooks/useApi';
import { adminApi, type UserDto, type PaginatedData } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  PATIENT: 'Paciente', DOCTOR: 'Médico', CLINIC: 'Clínica', ADMIN: 'Admin',
};
const ROLE_COLORS: Record<string, string> = {
  PATIENT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  DOCTOR:  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  CLINIC:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ADMIN:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function AdminUsersPage() {
  const [role,   setRole]   = useState<string>('');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const { state, refetch } = useApi<PaginatedData<UserDto>>(
    () => adminApi.users({ role: role || undefined, search: search || undefined, pageSize: 100 }),
    [role, search],
  );

  const handleStatus = async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => {
    setActing(id);
    try {
      await adminApi.setUserStatus(id, status);
      toast.success('Estado actualizado');
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al actualizar';
      toast.error(msg);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Todas las cuentas registradas en MedicGet" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email, nombre o apellido…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los roles</option>
          <option value="PATIENT">Pacientes</option>
          <option value="DOCTOR">Médicos</option>
          <option value="CLINIC">Clínicas</option>
          <option value="ADMIN">Administradores</option>
        </select>
      </div>

      <SectionCard noPadding>
        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}
        {state.status === 'error' && (
          <div className="p-6"><Alert variant="error">{state.error.message}</Alert></div>
        )}
        {state.status === 'ready' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">Usuario</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Rol</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.data.data.map((u) => {
                  const initials = ((u.profile?.firstName?.[0] ?? '') + (u.profile?.lastName?.[0] ?? '')).toUpperCase() || '··';
                  const sub = (u as unknown as { subscriptions?: { plan: { name: string } }[] }).subscriptions?.[0];
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} size="sm" variant="auto" />
                          <span className="font-medium text-slate-800 dark:text-white">
                            {u.profile?.firstName} {u.profile?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[u.role] ?? ''}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{sub?.plan.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={u.status.toLowerCase()}
                          statusMap={{
                            active:   { label: 'Activo',     bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700' },
                            inactive: { label: 'Suspendido', bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700'   },
                            deleted:  { label: 'Eliminado',  bg: 'bg-rose-100 dark:bg-rose-900/30',       text: 'text-rose-700'    },
                          }}
                          size="sm"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {u.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleStatus(u.id, 'INACTIVE')}
                              disabled={acting === u.id}
                              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                              title="Suspender"
                            >
                              <Ban size={12} /> Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatus(u.id, 'ACTIVE')}
                              disabled={acting === u.id}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                              title="Reactivar"
                            >
                              <RotateCcw size={12} /> Reactivar
                            </button>
                          )}
                          {u.status !== 'DELETED' && (
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar esta cuenta? La operación no se puede deshacer.')) {
                                  handleStatus(u.id, 'DELETED');
                                }
                              }}
                              disabled={acting === u.id}
                              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded-lg transition disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
