/**
 * Verifications service (superadmin).
 *
 * Workflow de aprobación manual de licencias médicas. El médico sube su
 * documento desde svc-doctor (POST /doctors/:id/license-document). Esto
 * crea un Doctor con `licenseVerificationStatus = PENDING_REVIEW` que
 * aparece en esta cola. El admin:
 *   1. Lista pendientes (`list`).
 *   2. Ve el detalle con el documento (lo descarga via
 *      GET /doctors/:id/license-document, que también ADMIN puede llamar).
 *   3. Aprueba (`approve`) → status=VERIFIED, el médico empieza a
 *      aparecer en búsqueda y puede recibir bookings.
 *   4. Rechaza (`reject`) → status=REJECTED + rejectionReason. El médico
 *      ve el motivo y puede subir un documento corregido.
 *
 * Idempotencia: approve/reject sobre un estado terminal devuelve la
 * misma entidad sin cambios ni notif duplicada.
 */

import { prisma }              from '@medicget/shared/prisma';
import { createNotification }  from '@medicget/shared/notifications';
import { sendEmail }           from '@medicget/shared/email';

export interface ListInput {
  page:     number;
  pageSize: number;
  /// Default = PENDING_REVIEW. `'ALL'` trae todos.
  status?:  'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ALL';
}

export interface RejectInput {
  /// OBLIGATORIO — se envía al médico como explicación.
  reason: string;
}

export const verificationsService = {
  async list({ page, pageSize, status = 'PENDING_REVIEW' }: ListInput) {
    const where = status === 'ALL' ? {} : { licenseVerificationStatus: status };
    const [data, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        // PENDING_REVIEW primero por fecha de upload (FIFO); el resto por nombre.
        orderBy: status === 'PENDING_REVIEW' || status === 'ALL'
          ? [{ licenseDocumentUploadedAt: 'asc' }, { createdAt: 'asc' }]
          : { createdAt: 'desc' },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        include: {
          user:   { include: { profile: true } },
          clinic: true,
        },
      }),
      prisma.doctor.count({ where }),
    ]);
    // El documento (dataURL) es pesado — NO lo incluimos en la lista; el
    // admin lo descarga via GET /doctors/:id/license-document al abrir
    // el detalle. Acá solo metadata.
    const sanitized = data.map((d) => ({
      ...d,
      licenseDocumentUrl: d.licenseDocumentUrl ? '__present__' : null,
    }));
    return { data: sanitized, total };
  },

  async approve(doctorId: string, adminUserId: string) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor)                                            throw new Error('Doctor not found');
    if (doctor.licenseVerificationStatus === 'VERIFIED')    return doctor;
    if (!doctor.licenseDocumentUrl)                          throw new Error('El médico todavía no subió un documento.');

    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        licenseVerificationStatus: 'VERIFIED',
        licenseVerifiedAt:         new Date(),
        licenseVerifiedBy:         adminUserId,
        licenseRejectionReason:    null,
      },
    });
    void notifyDoctorLicenseVerified(doctorId).catch(() => {/* swallow */});
    return updated;
  },

  async reject(doctorId: string, adminUserId: string, input: RejectInput) {
    const reason = input.reason.trim();
    if (!reason) throw new Error('El motivo de rechazo es obligatorio.');

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor)                                          throw new Error('Doctor not found');
    if (doctor.licenseVerificationStatus === 'REJECTED' && doctor.licenseRejectionReason === reason) {
      return doctor; // idempotente con mismo motivo
    }

    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        licenseVerificationStatus: 'REJECTED',
        licenseVerifiedAt:         null,
        licenseVerifiedBy:         adminUserId, // quién rechazó
        licenseRejectionReason:    reason,
      },
    });
    void notifyDoctorLicenseRejected(doctorId, reason).catch(() => {/* swallow */});
    return updated;
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Side-effect helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

async function notifyDoctorLicenseVerified(doctorId: string): Promise<void> {
  const doctor = await prisma.doctor.findUnique({
    where:   { id: doctorId },
    include: { user: { include: { profile: true } } },
  });
  if (!doctor) return;
  const docName = `${doctor.user.profile?.firstName ?? ''} ${doctor.user.profile?.lastName ?? ''}`.trim() || 'Médico';

  await createNotification({
    userId:   doctor.userId,
    type:     'LICENSE_VERIFIED',
    title:    'Tu licencia fue verificada ✓',
    message:  'Ya apareces en la búsqueda de pacientes y podés recibir citas.',
    metadata: { doctorId },
    pushUrl:  `/doctor/profile`,
  }).catch(() => {/* swallow */});

  if (doctor.user.email) {
    await sendEmail({
      to:      doctor.user.email,
      subject: 'Licencia verificada · MedicGet',
      html: `
        <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
            <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Tu licencia fue verificada, Dr. ${docName} ✓</h1>
            <p style="font-size:15px;color:#475569;margin:0 0 16px;line-height:1.5">
              Revisamos tu documento y todo está en orden. Tu perfil ya está visible para pacientes y empezás a recibir reservas.
            </p>
            <p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.6">
              Recordá completar tu disponibilidad horaria desde <strong>Mi calendario</strong> si aún no lo hiciste — sin horarios cargados los pacientes no pueden reservar.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
            <p style="font-size:11px;color:#94a3b8;margin:0">MedicGet · Correo automático.</p>
          </div>
        </body></html>`,
      text: `Tu licencia fue verificada. Ya estás visible para pacientes.`,
    });
  }
}

async function notifyDoctorLicenseRejected(doctorId: string, reason: string): Promise<void> {
  const doctor = await prisma.doctor.findUnique({
    where:   { id: doctorId },
    include: { user: { include: { profile: true } } },
  });
  if (!doctor) return;
  const docName = `${doctor.user.profile?.firstName ?? ''} ${doctor.user.profile?.lastName ?? ''}`.trim() || 'Médico';

  await createNotification({
    userId:   doctor.userId,
    type:     'LICENSE_REJECTED',
    title:    'Tu licencia necesita correcciones',
    message:  `Motivo: ${reason}. Subí un documento corregido desde tu perfil.`,
    metadata: { doctorId, reason },
    pushUrl:  `/doctor/profile`,
  }).catch(() => {/* swallow */});

  if (doctor.user.email) {
    await sendEmail({
      to:      doctor.user.email,
      subject: 'Tu licencia necesita correcciones · MedicGet',
      html: `
        <!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
            <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">Hola Dr. ${docName}</h1>
            <p style="font-size:15px;color:#475569;margin:0 0 16px;line-height:1.5">
              Revisamos tu documento de licencia y necesitamos que lo corrijas antes de poder verificar tu perfil.
            </p>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;margin:18px 0;border-radius:8px">
              <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5"><strong>Motivo:</strong> ${reason}</p>
            </div>
            <p style="font-size:14px;color:#475569;margin:0 0 14px;line-height:1.6">
              Ingresá a tu perfil y subí un documento corregido. Lo revisamos nuevamente apenas lo recibamos.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
            <p style="font-size:11px;color:#94a3b8;margin:0">MedicGet · Correo automático.</p>
          </div>
        </body></html>`,
      text: `Tu licencia necesita correcciones.\nMotivo: ${reason}\nSubí un documento corregido desde tu perfil.`,
    });
  }
}
