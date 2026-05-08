import { useState } from 'react';
import { Loader2, Ban, Trash2, RotateCcw, Search, UserPlus, X, Copy, Check } from 'lucide-react';
import { toast }         from 'sonner';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { Alert }         from '@/components/ui/Alert';
import { Avatar }        from '@/components/ui/Avatar';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { Input }         from '@/components/ui/Input';
import { PhoneField }    from '@/components/ui/PhoneField';
import { Button }        from '@/components/ui/Button';
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
  const [showCreate, setShowCreate] = useState(false);

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
      <PageHeader
        title="Usuarios"
        subtitle="Todas las cuentas registradas en MedicGet"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
          >
            <UserPlus size={15} /> Crear usuario
          </button>
        }
      />

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch(); }}
        />
      )}

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

/* ─────────────── Create user modal ─────────────── */

interface CreateForm {
  email:      string;
  firstName:  string;
  lastName:   string;
  phone:      string;
  role:       'PATIENT' | 'DOCTOR' | 'CLINIC' | 'ADMIN';
  clinicName: string;
  specialty:  string;
}

const EMPTY_CREATE: CreateForm = {
  email: '', firstName: '', lastName: '', phone: '',
  role: 'PATIENT', clinicName: '', specialty: '',
};

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form,    setForm]    = useState<CreateForm>(EMPTY_CREATE);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [created, setCreated] = useState<{ user: UserDto; tempPassword: string } | null>(null);
  const [copied,  setCopied]  = useState<'email' | 'password' | null>(null);

  const valid =
    form.email.includes('@') && form.firstName.trim() && form.lastName.trim() &&
    (form.role !== 'CLINIC' || form.clinicName.trim()) &&
    (form.role !== 'DOCTOR' || form.specialty.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await adminApi.createUser({
        email:      form.email.trim(),
        firstName:  form.firstName.trim(),
        lastName:   form.lastName.trim(),
        phone:      form.phone.trim() || undefined,
        role:       form.role,
        clinicName: form.role === 'CLINIC' ? form.clinicName.trim() : undefined,
        specialty:  form.role === 'DOCTOR' ? form.specialty.trim()  : undefined,
      });
      setCreated(res.data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo crear el usuario';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string, key: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
            <UserPlus size={18} className="text-rose-600" /> Crear usuario
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="text-emerald-600" size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">¡Usuario creado!</p>
                <p className="text-xs text-slate-500">
                  {created.user.profile?.firstName} {created.user.profile?.lastName} · {created.user.role}
                </p>
              </div>
            </div>
            <Alert variant="info">
              Le enviamos las credenciales por email. Acá las podés copiar — esta es la única vez que verás la contraseña.
            </Alert>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
              <CredRow
                label="Email"
                value={created.user.email}
                onCopy={() => copy(created.user.email, 'email')}
                copied={copied === 'email'}
              />
              <CredRow
                label="Contraseña temporal"
                value={created.tempPassword}
                bold
                onCopy={() => copy(created.tempPassword, 'password')}
                copied={copied === 'password'}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onCreated}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
              >
                Listo
              </Button>
              <Button
                onClick={() => { setCreated(null); setForm(EMPTY_CREATE); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl"
              >
                Crear otro
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            {err && <Alert variant="error">{err}</Alert>}

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Tipo de cuenta</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['PATIENT', 'DOCTOR', 'CLINIC', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      form.role === r
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {r === 'PATIENT' ? 'Paciente' : r === 'DOCTOR' ? 'Médico' : r === 'CLINIC' ? 'Clínica' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SimpleField label="Email *">
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </SimpleField>
              <SimpleField label="Teléfono">
                <PhoneField
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                />
              </SimpleField>
              <SimpleField label="Nombre *">
                <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </SimpleField>
              <SimpleField label="Apellido *">
                <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </SimpleField>
              {form.role === 'CLINIC' && (
                <SimpleField label="Nombre comercial *">
                  <Input required value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
                </SimpleField>
              )}
              {form.role === 'DOCTOR' && (
                <SimpleField label="Especialidad *">
                  <Input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </SimpleField>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={onClose} className="text-sm text-slate-500 px-4 py-2">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!valid || saving}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Crear usuario
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SimpleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function CredRow({ label, value, bold, onCopy, copied }: {
  label: string; value: string; bold?: boolean;
  onCopy: () => void; copied: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`font-mono text-sm ${bold ? 'font-bold text-base' : ''} text-slate-800 dark:text-white mt-0.5 select-all`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-2 rounded-lg transition"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
