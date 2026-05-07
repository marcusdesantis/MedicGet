/**
 * Settings — runtime configuration of the platform.
 *
 * The superadmin edits SMTP credentials, PayPhone token, Jitsi URL,
 * platform commission and branding from a single form. Submitting
 * persists everything to the AppSettings table; the runtime cache in
 * @medicget/shared/settings drops within seconds and the back-end
 * services pick up the new values.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save, Mail, CreditCard, Video, Palette } from 'lucide-react';
import { toast }       from 'sonner';
import { PageHeader }  from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert }       from '@/components/ui/Alert';
import { useApi }      from '@/hooks/useApi';
import { adminApi, type AppSettingDto } from '@/lib/api';

const CATEGORY_META: Record<string, { label: string; icon: typeof Mail; subtitle: string }> = {
  EMAIL:    { label: 'Email (SMTP)',     icon: Mail,       subtitle: 'Servidor SMTP para confirmaciones, recordatorios y avisos.' },
  PAYMENTS: { label: 'Pagos (PayPhone)', icon: CreditCard, subtitle: 'Credenciales de PayPhone y comisión de la plataforma.' },
  VIDEO:    { label: 'Videollamadas',    icon: Video,      subtitle: 'Servidor Jitsi (público o auto-hospedado).' },
  BRANDING: { label: 'Marca',            icon: Palette,    subtitle: 'Nombre y logo visibles en la landing.' },
  GENERAL:  { label: 'General',          icon: Palette,    subtitle: 'Otras claves de configuración.' },
};

const FRIENDLY_KEY: Record<string, { label: string; placeholder?: string }> = {
  SMTP_HOST:        { label: 'Servidor SMTP',          placeholder: 'smtp.gmail.com' },
  SMTP_PORT:        { label: 'Puerto',                 placeholder: '587' },
  SMTP_SECURE:      { label: 'TLS implícito (true/false)', placeholder: 'false' },
  SMTP_USER:        { label: 'Usuario',                placeholder: 'noreply@medicget.com' },
  SMTP_PASS:        { label: 'Contraseña / app password' },
  SMTP_FROM:        { label: 'Remitente (From)',       placeholder: 'MedicGet <noreply@medicget.com>' },
  PAYPHONE_TOKEN:    { label: 'Token Bearer de PayPhone' },
  PAYPHONE_STORE_ID: { label: 'Store ID',               placeholder: '12345' },
  PAYPHONE_BASE_URL: { label: 'Base URL',               placeholder: 'https://pay.payphonetodoesposible.com/api' },
  PLATFORM_FEE_PCT:  { label: 'Comisión plataforma (%)', placeholder: '10' },
  JITSI_BASE_URL:    { label: 'Base URL de Jitsi',       placeholder: 'https://meet.jit.si' },
  BRAND_NAME:        { label: 'Nombre de marca',         placeholder: 'MedicGet' },
  BRAND_LOGO_URL:    { label: 'URL del logo',            placeholder: 'https://…' },
};

export function AdminSettingsPage() {
  const { state, refetch } = useApi<AppSettingDto[]>(() => adminApi.settings(), []);
  const [draft,  setDraft]  = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') {
      const map: Record<string, string> = {};
      for (const s of state.data) map[s.key] = s.value ?? '';
      setDraft(map);
    }
  }, [state.status, state.status === 'ready' ? state.data : null]);

  const save = async () => {
    setSaving(true);
    try {
      // Only send keys that changed (or all if you prefer; the bulk
      // upsert is idempotent so either works).
      const values: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) {
        values[k] = v.length === 0 ? null : v;
      }
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

  // Group by category
  const byCategory = state.data.reduce<Record<string, AppSettingDto[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Variables de runtime de la plataforma" />

      <Alert variant="info">
        Los cambios se aplican en segundos sin reiniciar containers. Los valores en blanco
        usan el fallback de la variable de entorno (definida en docker-compose).
      </Alert>

      {Object.entries(byCategory).map(([cat, settings]) => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.GENERAL;
        const Icon = meta.icon;
        return (
          <SectionCard key={cat}>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Icon size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{meta.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {settings.map((s) => {
                const friendly = FRIENDLY_KEY[s.key];
                return (
                  <div key={s.id}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      {friendly?.label ?? s.key}
                      <code className="ml-2 text-[10px] text-slate-400">{s.key}</code>
                    </label>
                    <input
                      type={s.isSecret ? 'password' : 'text'}
                      value={draft[s.key] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      placeholder={friendly?.placeholder ?? '— por defecto desde env —'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })}

      <div className="flex justify-end sticky bottom-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar todo
        </button>
      </div>
    </div>
  );
}
