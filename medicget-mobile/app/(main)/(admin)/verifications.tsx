/**
 * Admin — Verificación de licencias. Espejo del AdminVerificationsPage web.
 *
 * Lista médicos por estado de verificación. El admin abre el detalle, ve
 * el documento (foto) y aprueba o rechaza con motivo. Solo los médicos
 * VERIFIED aparecen en la búsqueda y reciben citas.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { PolicyPanel } from '@/components/ui/PolicyPanel';
import { useApi } from '@/hooks/useApi';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { fmtMedDate, profileInitials } from '@/lib/format';
import {
  doctorsApi,
  verificationsApi,
  type VerificationDoctorDto,
  type VerificationStatus,
} from '@/lib/api';

const TABS: { value: VerificationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pendientes' },
  { value: 'VERIFIED', label: 'Verificados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'NOT_SUBMITTED', label: 'Sin enviar' },
];

const STATUS_LABEL: Record<VerificationStatus, { label: string; cls: string }> = {
  VERIFIED: { label: 'Verificado', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING_REVIEW: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Rechazado', cls: 'bg-rose-100 text-rose-700' },
  NOT_SUBMITTED: { label: 'Sin enviar', cls: 'bg-slate-200 text-slate-700' },
};

export default function AdminVerifications() {
  const router = useRouter();
  const [tab, setTab] = useState<VerificationStatus | 'ALL'>('PENDING_REVIEW');
  const [selected, setSelected] = useState<VerificationDoctorDto | null>(null);

  const { state, refetch } = useApi(
    () => verificationsApi.list({ status: tab, pageSize: 50 }),
    [tab],
  );
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center gap-2 mb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-1">
          <ArrowLeft size={20} color="#475569" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Verificaciones</Text>
      </View>
      <Text className="text-sm text-slate-500 mb-3">
        Revisá el documento de cada médico y aprobalo o rechazalo.
      </Text>

      <View className="mb-3">
        <PolicyPanel
          title="Guía de aprobación"
          icon={ShieldCheck}
          tone="blue"
          steps={[
            'Abrí "Ver documento" y confirmá que sea legible y corresponda a un título / credencial real.',
            'Verificá que el nombre del documento coincida con el del médico.',
            'Si todo está en orden → Aprobar. El médico aparece en búsqueda y recibe citas.',
            'Si hay un problema → Rechazar con un motivo claro. El médico lo recibe por email y puede reenviar.',
          ]}
        />
      </View>

      <View className="flex-row flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            className={`px-3.5 py-2 rounded-xl ${
              tab === t.value
                ? 'bg-rose-600'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}>
            <Text
              className={`text-xs font-semibold ${
                tab === t.value ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {state.status === 'loading' && (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      )}
      {state.status === 'error' && <Alert variant="error">{state.error.message}</Alert>}
      {state.status === 'ready' && state.data.data.length === 0 && (
        <EmptyState title="Sin resultados" description="No hay médicos en esta categoría." />
      )}

      {state.status === 'ready' && state.data.data.length > 0 && (
        <View className="gap-3">
          {state.data.data.map((d) => (
            <DoctorCard key={d.id} doctor={d} onOpen={() => setSelected(d)} />
          ))}
        </View>
      )}

      <DocumentModal
        doctor={selected}
        onClose={() => setSelected(null)}
        onDone={() => { setSelected(null); refetch(); }}
      />
    </Screen>
  );
}

function DoctorCard({
  doctor,
  onOpen,
}: {
  doctor: VerificationDoctorDto;
  onOpen: () => void;
}) {
  const p = doctor.user.profile;
  const fullName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Médico';
  const hasDoc = doctor.licenseDocumentUrl === '__present__';
  const badge = STATUS_LABEL[doctor.licenseVerificationStatus];

  return (
    <SectionCard>
      <View className="flex-row items-start gap-3">
        <Avatar initials={profileInitials(p, 'D')} imageUrl={p.avatarUrl ?? null} size="md" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-800 dark:text-white">Dr. {fullName}</Text>
          <Text className="text-xs text-slate-500">{doctor.specialty}</Text>
          <Text className="text-[11px] text-slate-400">{doctor.user.email}</Text>
        </View>
        <View className={`px-2 py-0.5 rounded-md ${badge.cls}`}>
          <Text className="text-[10px] font-bold">{badge.label}</Text>
        </View>
      </View>

      <View className="mt-2 gap-0.5">
        {doctor.licenseNumber ? (
          <Text className="text-xs text-slate-500">N° licencia: <Text className="text-slate-700 dark:text-slate-200">{doctor.licenseNumber}</Text></Text>
        ) : null}
        {doctor.nationalId ? (
          <Text className="text-xs text-slate-500">Cédula: <Text className="text-slate-700 dark:text-slate-200">{doctor.nationalId}</Text></Text>
        ) : null}
        {doctor.licenseAuthority ? (
          <Text className="text-xs text-slate-500">Autoridad: <Text className="text-slate-700 dark:text-slate-200">{doctor.licenseAuthority}</Text></Text>
        ) : null}
        {doctor.licenseVerificationStatus === 'VERIFIED' && doctor.licenseVerificationSource ? (
          <Text className="text-xs text-slate-500">
            Vía: <Text className="text-slate-700 dark:text-slate-200">{doctor.licenseVerificationSource === 'ACESS_AUTO' ? 'ACESS (auto)' : 'Manual'}</Text>
          </Text>
        ) : null}
      </View>

      {doctor.licenseRejectionReason && doctor.licenseVerificationStatus === 'REJECTED' ? (
        <View className="mt-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">
          <Text className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 mb-0.5">Motivo del rechazo</Text>
          <Text className="text-xs text-rose-700 dark:text-rose-200">{doctor.licenseRejectionReason}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onOpen}
        disabled={!hasDoc}
        className={`mt-3 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
          hasDoc ? 'bg-blue-600 active:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
        {hasDoc ? <Eye size={14} color="#fff" /> : <FileText size={14} color="#94a3b8" />}
        <Text className={`text-xs font-semibold ${hasDoc ? 'text-white' : 'text-slate-400'}`}>
          {hasDoc ? 'Ver documento' : 'Sin documento'}
        </Text>
      </Pressable>
    </SectionCard>
  );
}

function DocumentModal({
  doctor,
  onClose,
  onDone,
}: {
  doctor: VerificationDoctorDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docMime, setDocMime] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    let cancelled = false;
    setLoadingDoc(true);
    setErrorDoc(null);
    setDocUrl(null);
    setRejectMode(false);
    setReason('');
    doctorsApi
      .getLicense(doctor.id)
      .then((res) => {
        if (cancelled) return;
        setDocUrl(res.data.url);
        setDocMime(res.data.mime);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'No se pudo cargar el documento.';
        setErrorDoc(msg);
      })
      .finally(() => { if (!cancelled) setLoadingDoc(false); });
    return () => { cancelled = true; };
  }, [doctor]);

  if (!doctor) return null;

  const canAct = doctor.licenseVerificationStatus === 'PENDING_REVIEW';
  const isPdf = docMime === 'application/pdf';
  const fullName = `${doctor.user.profile.firstName ?? ''} ${doctor.user.profile.lastName ?? ''}`.trim() || 'Médico';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await verificationsApi.approve(doctor.id);
      onDone();
    } catch {
      setSubmitting(false);
    }
  };
  const handleReject = async () => {
    if (reason.trim().length < 5) return;
    setSubmitting(true);
    try {
      await verificationsApi.reject(doctor.id, { reason: reason.trim() });
      onDone();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={!!doctor}
      onClose={onClose}
      title={`Dr. ${fullName}`}
      footer={
        canAct ? (
          rejectMode ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button variant="secondary" onPress={() => setRejectMode(false)} disabled={submitting} fullWidth>
                  Cancelar
                </Button>
              </View>
              <View className="flex-1">
                <Pressable
                  onPress={handleReject}
                  disabled={reason.trim().length < 5 || submitting}
                  className={`h-12 rounded-2xl items-center justify-center bg-rose-600 active:bg-rose-700 ${
                    reason.trim().length < 5 || submitting ? 'opacity-60' : ''
                  }`}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">Confirmar rechazo</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button variant="secondary" onPress={() => setRejectMode(true)} disabled={submitting} fullWidth>
                  Rechazar
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="success" onPress={handleApprove} loading={submitting} fullWidth>
                  <View className="flex-row items-center gap-2">
                    <CheckCircle2 size={16} color="#fff" />
                    <Text className="text-white font-semibold">Aprobar</Text>
                  </View>
                </Button>
              </View>
            </View>
          )
        ) : (
          <Text className="text-xs text-slate-500 text-center">
            Este médico está {STATUS_LABEL[doctor.licenseVerificationStatus].label.toLowerCase()}.
          </Text>
        )
      }>
      <Text className="text-xs text-slate-500 mb-3">
        {doctor.specialty}
        {doctor.licenseNumber ? ` · N° ${doctor.licenseNumber}` : ''}
        {doctor.nationalId ? ` · CI ${doctor.nationalId}` : ''}
      </Text>

      {loadingDoc ? (
        <View className="py-10 items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : errorDoc ? (
        <Alert variant="error">{errorDoc}</Alert>
      ) : docUrl ? (
        isPdf ? (
          <Pressable
            onPress={() => Linking.openURL(docUrl)}
            className="flex-row items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl py-6">
            <FileText size={18} color="#475569" />
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">Abrir PDF</Text>
          </Pressable>
        ) : (
          <Image
            source={{ uri: docUrl }}
            style={{ width: '100%', height: 320, borderRadius: 12, backgroundColor: '#f1f5f9' }}
            resizeMode="contain"
          />
        )
      ) : null}

      {rejectMode ? (
        <View className="mt-3">
          <FormField label="Motivo del rechazo *" hint="Mínimo 5 caracteres — se envía al médico.">
            <Input value={reason} onChangeText={setReason} placeholder="ej: La foto está borrosa." />
          </FormField>
        </View>
      ) : null}
    </Modal>
  );
}
