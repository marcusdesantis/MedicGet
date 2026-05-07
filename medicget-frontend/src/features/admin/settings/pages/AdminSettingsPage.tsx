/**
 * Settings — runtime configuration de la plataforma con tabs.
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ ⚙ General │ 📧 Configuración de correo │ 💳 Pagos │ 📹 Video │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ <contenido del tab activo>                                        │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  Tab "Configuración de correo" sigue el patrón del mockup:
 *    - Toggle "Envío de correos activo" arriba
 *    - Píldoras de proveedor (Gmail / Outlook / Yahoo / Office 365 /
 *      Zoho / Personalizado) que auto-llenan host+puerto+TLS
 *    - Inputs por separado para credenciales y nombre del remitente
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Save, Mail, CreditCard, Video, Palette, Settings2, Eye, EyeOff,
} from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type AppSettingDto } from '@/lib/api';

type TabKey = 'general' | 'email' | 'payments' | 'video';

const TABS: { key: TabKey; label: string; icon: typeof Settings2 }[] = [
  { key: 'general',  label: 'General',                 icon: Settings2 },
  { key: 'email',    label: 'Configuración de correo', icon: Mail      },
  { key: 'payments', label: 'Pagos',                   icon: CreditCard },
  { key: 'video',    label: 'Videollamadas',           icon: Video     },
];

/* ─── Provider presets (auto-llenado de host/puerto/TLS) ─────────────── */
interface SmtpProvider {
  key:    string;
  label:  string;
  host:   string;
  port:   string;
  secure: string; // "true" → SSL implícito (465), "false" → STARTTLS (587)
}
const PROVIDERS: SmtpProvider[] = [
  { key: 'gmail',    label: 'Gmail',           host: 'smtp.gmail.com',         port: '587', secure: 'false' },
  { key: 'outlook',  label: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com',  port: '587', secure: 'false' },
  { key: 'yahoo',    label: 'Yahoo Mail',      host: 'smtp.mail.yahoo.com',    port: '587', secure: 'false' },
  { key: 'office',   label: 'Office 365',      host: 'smtp.office365.com',     port: '587', secure: 'false' },
  { key: 'zoho',     label: 'Zoho Mail',       host: 'smtp.zoho.com',          port: '587', secure: 'false' },
  { key: 'custom',   label: 'Personalizado',   host: '',                       port: '587', secure: 'false' },
];

export function AdminSettingsPage() {
  const { state, refetch } = useApi<AppSettingDto[]>(() => adminApi.settings(), []);
  const [tab,    setTab]    = useState<TabKey>('general');
  const [draft,  setDraft]  = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') {
      const m: Record<string, string> = {};
      for (const s of state.data) m[s.key] = s.value ?? '';
      setDraft(m);
    }
  }, [state.status, state.status === 'ready' ? state.data : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      const values: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) values[k] = v.length === 0 ? null : v;
      await adminApi.saveSettings(values);
      toast.success('Configuración guardada. Los cambios se aplican en segundos.');
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (state.status === 'loading') {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  }
  if (state.status === 'error') {
    return <Alert variant="error" action={
      <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
    }>{state.error.message}</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Variables de runtime de la plataforma" />

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 -mt-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'general'  && <GeneralTab  draft={draft} setDraft={setDraft} />}
      {tab === 'email'    && <EmailTab    draft={draft} setDraft={setDraft} />}
      {tab === 'payments' && <PaymentsTab draft={draft} setDraft={setDraft} />}
      {tab === 'video'    && <VideoTab    draft={draft} setDraft={setDraft} />}

      <div className="flex justify-end sticky bottom-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

/* ─────────────── General tab ─────────────── */
function GeneralTab({ draft, setDraft }: TabProps) {
  return (
    <SectionCard>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center"><Palette size={18} /></div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">Marca</h3>
          <p className="text-xs text-slate-500">Nombre y logo visibles en la landing.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Field label="Nombre de marca" k="BRAND_NAME"     draft={draft} setDraft={setDraft} placeholder="MedicGet" />
        <Field label="URL del logo"    k="BRAND_LOGO_URL" draft={draft} setDraft={setDraft} placeholder="https://…" />
      </div>
    </SectionCard>
  );
}

/* ─────────────── Email tab ─────────────── */
function EmailTab({ draft, setDraft }: TabProps) {
  const enabled = (draft['SMTP_ENABLED'] ?? 'true') === 'true';

  // ¿Qué proveedor matchea el host actual?
  const activeProvider = useMemo<string>(() => {
    const host = (draft['SMTP_HOST'] ?? '').toLowerCase();
    const found = PROVIDERS.find((p) => p.host && p.host.toLowerCase() === host);
    return found?.key ?? 'custom';
  }, [draft['SMTP_HOST']]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyProvider = (p: SmtpProvider) => {
    setDraft({ ...draft, SMTP_HOST: p.host, SMTP_PORT: p.port, SMTP_SECURE: p.secure });
  };

  return (
    <div className="space-y-4">
      {/* Master switch */}
      <SectionCard>
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            enabled
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Mail size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 dark:text-white">
              {enabled ? 'Envío de correos activo' : 'Envío de correos pausado'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {enabled
                ? 'El sistema enviará confirmaciones, recordatorios y notificaciones por correo.'
                : 'Si está desactivado el sistema no enviará ningún correo.'}
            </p>
          </div>
          <ToggleSwitch
            checked={enabled}
            onChange={(v) => setDraft({ ...draft, SMTP_ENABLED: v ? 'true' : 'false' })}
            onLabel="Activado"
            offLabel="Desactivado"
          />
        </div>
      </SectionCard>

      {/* Provider preset pills */}
      <SectionCard>
        <p className="text-xs font-semibold text-slate-500 mb-2">Proveedor</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => {
            const on = p.key === activeProvider;
            return (
              <button
                key={p.key}
                onClick={() => applyProvider(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  on
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="md:col-span-2">
            <Field label="Servidor SMTP" k="SMTP_HOST" draft={draft} setDraft={setDraft} placeholder="smtp.gmail.com" />
          </div>
          <Field label="Puerto" k="SMTP_PORT" draft={draft} setDraft={setDraft} type="number" placeholder="587" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="Usuario / Email remitente" k="SMTP_USER" draft={draft} setDraft={setDraft} placeholder="no-reply@empresa.com" />
          <PasswordField label="Contraseña / App Password" k="SMTP_PASS" draft={draft} setDraft={setDraft} placeholder="Contraseña o App Password" />
          <Field label="Nombre del remitente" k="SMTP_FROM" draft={draft} setDraft={setDraft} placeholder="MedicGet <noreply@medicget.com>" />
        </div>

        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={(draft['SMTP_SECURE'] ?? 'false') === 'true'}
            onChange={(e) => setDraft({ ...draft, SMTP_SECURE: e.target.checked ? 'true' : 'false' })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">Usar SSL/TLS implícito</span>
          <span className="text-xs text-slate-400 ml-2">(activá esto sólo si tu proveedor usa puerto 465)</span>
        </label>
      </SectionCard>
    </div>
  );
}

/* ─────────────── Payments tab ─────────────── */
function PaymentsTab({ draft, setDraft }: TabProps) {
  return (
    <SectionCard>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><CreditCard size={18} /></div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">Pasarela de pagos · PayPhone</h3>
          <p className="text-xs text-slate-500">Credenciales del comercio + comisión de la plataforma.</p>
        </div>
      </div>
      <Alert variant="info" >
        Si dejás el token vacío, el sistema corre en modo de desarrollo (stub) y aprueba todos los pagos automáticamente.
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <PasswordField label="Token Bearer de PayPhone" k="PAYPHONE_TOKEN"    draft={draft} setDraft={setDraft} />
        <Field         label="Store ID"                  k="PAYPHONE_STORE_ID" draft={draft} setDraft={setDraft} placeholder="12345" />
        <Field         label="Base URL de PayPhone"      k="PAYPHONE_BASE_URL" draft={draft} setDraft={setDraft} placeholder="https://pay.payphonetodoesposible.com/api" />
        <Field         label="Comisión plataforma (%)"   k="PLATFORM_FEE_PCT"  draft={draft} setDraft={setDraft} type="number" placeholder="10" />
      </div>
    </SectionCard>
  );
}

/* ─────────────── Video tab ─────────────── */
function VideoTab({ draft, setDraft }: TabProps) {
  return (
    <SectionCard>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center"><Video size={18} /></div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">Videollamadas · Jitsi</h3>
          <p className="text-xs text-slate-500">URL del servidor Jitsi. Vacío = público <code>meet.jit.si</code>.</p>
        </div>
      </div>
      <div className="mt-4">
        <Field label="Base URL de Jitsi" k="JITSI_BASE_URL" draft={draft} setDraft={setDraft} placeholder="https://meet.jit.si" />
      </div>
    </SectionCard>
  );
}

/* ─────────────── Inputs reusables ─────────────── */
interface TabProps {
  draft:    Record<string, string>;
  setDraft: (d: Record<string, string>) => void;
}

function Field({ label, k, draft, setDraft, type = 'text', placeholder }: TabProps & {
  label: string; k: string; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{label}</span>
      <input
        type={type}
        value={draft[k] ?? ''}
        onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function PasswordField({ label, k, draft, setDraft, placeholder }: TabProps & {
  label: string; k: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={draft[k] ?? ''}
          onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </label>
  );
}
