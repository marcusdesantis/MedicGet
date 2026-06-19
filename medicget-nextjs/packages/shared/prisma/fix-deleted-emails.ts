/**
 * fix-deleted-emails.ts
 *
 * Script puntual: anonimiza el email de todos los usuarios que ya tienen
 * status=DELETED pero conservan su email original (bloqueando que otra
 * persona se registre con ese correo).
 *
 * También sincroniza Doctor/Clinic/Patient.status = DELETED para los
 * registros que quedaron con status=ACTIVE por el bug anterior.
 *
 * Correr UNA sola vez desde la raíz del monorepo:
 *   cd packages/shared
 *   npx ts-node --project ./prisma/tsconfig.seed.json prisma/fix-deleted-emails.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Usuarios eliminados cuyo email NO fue anonimizado todavía
  const deletedUsers = await prisma.user.findMany({
    where: {
      status: 'DELETED',
      NOT: { email: { endsWith: '@deleted.invalid' } },
    },
    select: { id: true, email: true, role: true },
  });

  if (deletedUsers.length === 0) {
    console.log('No hay usuarios eliminados con email sin anonimizar. Nada que hacer.');
    return;
  }

  console.log(`Encontrados ${deletedUsers.length} usuario(s) a corregir:`);

  for (const user of deletedUsers) {
    const anonEmail = `deleted_${user.id}@deleted.invalid`;

    const ops: Parameters<typeof prisma.$transaction>[0] = [
      prisma.user.update({
        where: { id: user.id },
        data:  { email: anonEmail },
      }),
    ];

    // Sincronizar status en la tabla hija si quedó ACTIVE
    if (user.role === 'DOCTOR') {
      ops.push(
        prisma.doctor.updateMany({
          where: { userId: user.id, status: { not: 'DELETED' } },
          data:  { status: 'DELETED' },
        }) as never,
      );
    } else if (user.role === 'CLINIC') {
      ops.push(
        prisma.clinic.updateMany({
          where: { userId: user.id, status: { not: 'DELETED' } },
          data:  { status: 'DELETED' },
        }) as never,
      );
    } else if (user.role === 'PATIENT') {
      ops.push(
        prisma.patient.updateMany({
          where: { userId: user.id, status: { not: 'DELETED' } },
          data:  { status: 'DELETED' },
        }) as never,
      );
    }

    await prisma.$transaction(ops);
    console.log(`  ✓ ${user.email} (${user.role}) → ${anonEmail}`);
  }

  console.log('\nScript completado. Emails liberados.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
