/**
 * Admin — Configuración. Espejo del AdminSettingsPage web.
 *
 * Listado de variables de runtime agrupadas por categoría. Cada valor
 * editable inline; los `isSecret` se ocultan por defecto con toggle ver.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Mail,
  Palette,
  Save,
  Settings as SettingsIcon,
  Video,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { adminApi, type AppSettingDto } from '@/lib/api';

const CATEGORY_META: Record<
  string,
  { label: string; icon: typeof SettingsIcon }
> = {
  general: { label: 'General', icon: SettingsIcon },
  branding: { label: 'Branding', icon: Palette },
  email: { label: 'Correo (SMTP)', icon: Mail },
  smtp: { label: 'Correo (SMTP)', icon: Mail },
  payments: { label: 'Pagos', icon: CreditCard },
  payphone: { label: 'Pagos', icon: CreditCard },
  video: { label: 'Videollamadas', icon: Video },
  jitsi: { label: 'Videollamadas', icon: Video },
};

function categoryMeta(cat: string) {
  const key = cat.toLowerCase();
  return (
    CATEGORY_META[key] ?? {
      label: cat || 'Otros',
      icon: SettingsIcon,
    }
  );
}

export default function AdminSettings() {
  const { state, refetch } = useApi(() => adminApi.settings(), []);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') {
      const m: Record<string, string> = {};
      for (const s of state.data) m[s.key] = s.value ?? '';
      setDraft(m);
    }
  }, [state]);

  const grouped = useMemo(() => {
    if (state.status !== 'ready') return new Map<string, AppSettingDto[]>();
    const m = new Map<string, AppSettingDto[]>();
    for (const s of state.data) {
      const cat = (s.category || 'general').toLowerCase();
      const list = m.get(cat) ?? [];
      list.push(s);
      m.set(cat, list);
    }
    return m;
  }, [state]);

  const dirty = useMemo(() => {
    if (state.status !== 'ready') return false;
    for (const s of state.data) {
      if ((s.value ?? '') !== (draft[s.key] ?? '')) return true;
    }
    return false;
  }, [state, draft]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setSuccess(false);
    try {
      const values: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) {
        values[k] = v.length === 0 ? null : v;
      }
      await adminApi.saveSettings(values);
      setSuccess(true);
      refetch();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Error al guardar';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Alert variant="error">
          <Text className="text-rose-700 dark:text-rose-300 text-sm">
            {state.error.message}
          </Text>
          <Pressable onPress={refetch} className="mt-2">
            <Text className="text-rose-600 text-xs font-semibold">
              Reintentar
            </Text>
          </Pressable>
        </Alert>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Configuración"
        subtitle="Variables de runtime de la plataforma"
      />

      <Alert variant="info">
        <Text className="text-sm text-blue-700 dark:text-blue-300">
          Los cambios se aplican en segundos sin redeploy. Las claves con
          asterisco son secretas — tocá el ojo para verlas.
        </Text>
      </Alert>

      <View className="gap-4 mt-4">
        {Array.from(grouped.entries()).map(([cat, settings]) => {
          const meta = categoryMeta(cat);
          const Icon = meta.icon;
          return (
            <SectionCard
              key={cat}
              title={meta.label}
              action={<Icon size={16} color="#94a3b8" />}>
              <View className="gap-3">
                {settings.map((s) => (
                  <SettingRow
                    key={s.id}
                    setting={s}
                    value={draft[s.key] ?? ''}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, [s.key]: v }))
                    }
                  />
                ))}
              </View>
            </SectionCard>
          );
        })}
      </View>

      {err ? (
        <View className="mt-4">
          <Alert variant="error">{err}</Alert>
        </View>
      ) : null}
      {success ? (
        <View className="mt-4">
          <Alert variant="success">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={14} color="#10b981" />
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm">
                Configuración guardada.
              </Text>
            </View>
          </Alert>
        </View>
      ) : null}

      <View className="mt-4">
        <Button
          onPress={save}
          disabled={!dirty || saving}
          loading={saving}
          fullWidth>
          <View className="flex-row items-center gap-2">
            <Save size={16} color="#fff" />
            <Text className="text-white text-base font-semibold">
              Guardar cambios
            </Text>
          </View>
        </Button>
      </View>
    </Screen>
  );
}

function SettingRow({
  setting,
  value,
  onChange,
}: {
  setting: AppSettingDto;
  value: string;
  onChange: (v: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const isSecret = setting.isSecret && !reveal;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {setting.key} {setting.isSecret ? '*' : ''}
        </Text>
        {setting.isSecret ? (
          <Pressable onPress={() => setReveal((v) => !v)} hitSlop={4}>
            {reveal ? (
              <EyeOff size={12} color="#94a3b8" />
            ) : (
              <Eye size={12} color="#94a3b8" />
            )}
          </Pressable>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={isSecret}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Sin valor"
        placeholderTextColor="#cbd5e1"
        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
      />
    </View>
  );
}
