/**
 * License Verification — upload del documento de licencia médica.
 *
 * El médico sube una foto del título / colegiatura desde su perfil. El
 * service:
 *   1. Valida formato dataURL (`data:<mime>;base64,...`) y tamaño.
 *   2. Guarda en `Doctor.licenseDocumentUrl` (+ mime + uploadedAt).
 *   3. Transiciona `licenseVerificationStatus` a PENDING_REVIEW.
 *   4. Limpia rejectionReason / verifiedAt / verifiedBy de revisiones
 *      anteriores (re-upload tras rejection vuelve a empezar el ciclo).
 *   5. Notifica a todos los ADMIN que hay un nuevo doc para revisar.
 *
 * La aprobación / rechazo viven en svc-admin (verifications.service.ts).
 *
 * Mismo patrón de almacenamiento que avatarUrl y attachmentUrl: dataURL
 * en BD. Cuando migremos a object storage, esto pasa a ser un URL firmado.
 */

import { prisma }              from '@medicget/shared/prisma';
import { createNotification }  from '@medicget/shared/notifications';
import type { AuthUser }       from '@medicget/shared/auth';
import { isValidEcuadorianCedula, normalizeCedula } from '@medicget/shared/cedula';
import { verifyMedicalLicense } from '@medicget/shared/license-verifier';

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
type AllowedMime = typeof ALLOWED_MIMES[number];

/// Máximo 5 MB en base64 ≈ 6.7 MB de string. Coincide con el límite que
/// el nginx interno ya acepta para attachments (`client_max_body_size 10M`).
const MAX_DATAURL_LEN = 7 * 1024 * 1024;

function parseDataUrl(dataUrl: string): { mime: AllowedMime; valid: true } | { valid: false; reason: string } {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return { valid: false, reason: 'El documento debe enviarse como dataURL (data:<mime>;base64,...).' };
  }
  if (dataUrl.length > MAX_DATAURL_LEN) {
    return { valid: false, reason: 'El documento es demasiado grande (máximo 5 MB).' };
  }
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  if (!match) {
    return { valid: false, reason: 'Formato dataURL inválido — debe ser base64.' };
  }
  const mime = match[1].toLowerCase() as AllowedMime;
  if (!ALLOWED_MIMES.includes(mime)) {
    return { valid: false, reason: `Tipo no soportado (${mime}). Aceptamos JPG, PNG, WebP o PDF.` };
  }
  return { mime, valid: true };
}

export const licenseService = {
  /**
   * Verificación AUTOMÁTICA contra ACESS por cédula. Auth: solo el médico
   * dueño. Flujo:
   *   1. Valida estructura de la cédula (módulo 10) — rechazo si inválida.
   *   2. Persiste `nationalId`.
   *   3. Consulta ACESS (fail-safe — nunca lanza).
   *   4. Si el match es INEQUÍVOCO → marca VERIFIED + source ACESS_AUTO +
   *      guarda evidencia + notifica. Devuelve { autoVerified: true }.
   *   5. Si ACESS no confirma (no encontrado / no disponible / ambiguo) →
   *      NO cambia el status. Devuelve { autoVerified: false, reason } para
   *      que el frontend ofrezca el flujo manual (subir documento).
   */
  async requestAutoVerification(
    doctorId: string,
    user:     AuthUser,
    rawCedula: string,
  ): Promise<ServiceResult<{ autoVerified: boolean; reason: string }>> {
    if (user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Solo el médico puede verificar su propia cuenta.' };
    }
    const doctor = await prisma.doctor.findUnique({
      where:   { id: doctorId },
      include: { user: { include: { profile: true } } },
    });
    if (!doctor)                   return { ok: false, code: 'NOT_FOUND', message: 'Médico no encontrado.' };
    if (doctor.userId !== user.id) return { ok: false, code: 'FORBIDDEN', message: 'Solo podés verificar tu propia cuenta.' };

    const cedula = normalizeCedula(rawCedula);
    if (!isValidEcuadorianCedula(cedula)) {
      return { ok: false, code: 'BAD_REQUEST', message: 'La cédula no es válida. Revisá los 10 dígitos.' };
    }

    // Persistimos la cédula sí o sí (sirve para la revisión manual también).
    await prisma.doctor.update({ where: { id: doctorId }, data: { nationalId: cedula } });

    const fullName = `${doctor.user.profile?.firstName ?? ''} ${doctor.user.profile?.lastName ?? ''}`.trim();
    const result = await verifyMedicalLicense({ cedula, fullName: fullName || undefined });

    if (result.outcome === 'VERIFIED') {
      await prisma.doctor.update({
        where: { id: doctorId },
        data: {
          licenseVerificationStatus:   'VERIFIED',
          licenseVerifiedAt:           new Date(),
          licenseVerificationSource:   'ACESS_AUTO',
          licenseVerificationEvidence: (result.evidence ?? {}) as object,
          licenseRejectionReason:      null,
        },
      });
      void notifyDoctorAutoVerified(doctorId).catch(() => {/* swallow */});
      return { ok: true, data: { autoVerified: true, reason: result.reason } };
    }

    // No concluyente → queda para el flujo manual. No tocamos el status.
    return {
      ok: true,
      data: {
        autoVerified: false,
        reason: result.outcome === 'NOT_FOUND'
          ? 'No encontramos tu registro en ACESS. Subí tu documento para revisión manual.'
          : 'No pudimos verificarte automáticamente ahora. Subí tu documento para revisión manual.',
      },
    };
  },

  /**
   * Sube el documento de licencia. Auth: solo el médico dueño del perfil.
   * Idempotente: si ya había uno cargado, se reemplaza y el status vuelve
   * a PENDING_REVIEW (se borra approvedAt/Bp/rejectionReason para auditar
   * cada revisión por separado).
   */
  async uploadDocument(
    doctorId:    string,
    user:        AuthUser,
    dataUrl:     string,
  ): Promise<ServiceResult<{ status: 'PENDING_REVIEW' }>> {
    if (user.role !== 'DOCTOR') {
      return { ok: false, code: 'FORBIDDEN', message: 'Solo el médico puede subir su propio documento.' };
    }
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor)                  return { ok: false, code: 'NOT_FOUND', message: 'Médico no encontrado.' };
    if (doctor.userId !== user.id) return { ok: false, code: 'FORBIDDEN', message: 'Solo podés subir tu propio documento.' };

    const parsed = parseDataUrl(dataUrl);
    if (!parsed.valid) return { ok: false, code: 'BAD_REQUEST', message: parsed.reason };

    await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        licenseDocumentUrl:        dataUrl,
        licenseDocumentMime:       parsed.mime,
        licenseDocumentUploadedAt: new Date(),
        licenseVerificationStatus: 'PENDING_REVIEW',
        // Limpiamos rastros de una revisión anterior para que la cola admin
        // muestre el doc como una pendiente nueva (no "verified" con doc viejo).
        licenseVerifiedAt:         null,
        licenseVerifiedBy:         null,
        licenseRejectionReason:    null,
      },
    });

    void notifyAdminsLicensePending(doctorId).catch(() => {/* swallow */});
    return { ok: true, data: { status: 'PENDING_REVIEW' } };
  },

  /**
   * Stream del documento al caller. Solo accesible para:
   *   • el médico dueño del documento (para previsualizar lo que subió),
   *   • un ADMIN (para revisarlo y aprobar/rechazar).
   *
   * Devuelve la dataURL — el frontend la usa directamente en <img> o
   * <iframe>. No exponemos como descarga signed-URL porque el patrón del
   * proyecto es dataURL en BD (ver avatarUrl, attachmentUrl).
   */
  async getDocument(
    doctorId: string,
    user:     AuthUser,
  ): Promise<ServiceResult<{ url: string; mime: string | null; uploadedAt: Date | null; status: string }>> {
    const doctor = await prisma.doctor.findUnique({
      where:  { id: doctorId },
      select: {
        userId: true,
        licenseDocumentUrl: true,
        licenseDocumentMime: true,
        licenseDocumentUploadedAt: true,
        licenseVerificationStatus: true,
      },
    });
    if (!doctor) return { ok: false, code: 'NOT_FOUND', message: 'Médico no encontrado.' };

    const isOwner = user.role === 'DOCTOR' && doctor.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return { ok: false, code: 'FORBIDDEN', message: 'No tenés permiso para ver este documento.' };
    }
    if (!doctor.licenseDocumentUrl) {
      return { ok: false, code: 'NOT_FOUND', message: 'Todavía no se subió ningún documento.' };
    }
    return {
      ok: true,
      data: {
        url:        doctor.licenseDocumentUrl,
        mime:       doctor.licenseDocumentMime,
        uploadedAt: doctor.licenseDocumentUploadedAt,
        status:     doctor.licenseVerificationStatus,
      },
    };
  },
};

async function notifyDoctorAutoVerified(doctorId: string): Promise<void> {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return;
  await createNotification({
    userId:   doctor.userId,
    type:     'LICENSE_VERIFIED',
    title:    'Cuenta verificada automáticamente ✓',
    message:  'Validamos tu habilitación profesional contra ACESS. Ya aparecés en la búsqueda y podés recibir citas.',
    metadata: { doctorId, source: 'ACESS_AUTO' },
    pushUrl:  '/doctor/profile',
  }).catch(() => {/* swallow */});
}

async function notifyAdminsLicensePending(doctorId: string): Promise<void> {
  const doctor = await prisma.doctor.findUnique({
    where:   { id: doctorId },
    include: { user: { include: { profile: true } } },
  });
  if (!doctor) return;
  const docName = `${doctor.user.profile?.firstName ?? ''} ${doctor.user.profile?.lastName ?? ''}`.trim() || 'Médico';

  const admins = await prisma.user.findMany({
    where:  { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId:   admin.id,
        type:     'LICENSE_PENDING_REVIEW',
        title:    'Nueva licencia para revisar',
        message:  `Dr. ${docName} (${doctor.specialty}) subió su documento de licencia.`,
        metadata: { doctorId },
        pushUrl:  `/admin/verifications`,
      }).catch(() => {/* swallow */}),
    ),
  );
}
