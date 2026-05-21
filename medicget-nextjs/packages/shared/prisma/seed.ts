/**
 * Database seed - solo crea el superadmin y demo accounts si no existen.
 *
 * El seed de planes / suscripciones se elimino junto con el sistema de
 * planes. El registro es 100% gratuito y todas las cuentas tienen full
 * features sin restricciones.
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function main() {
  console.log('Seeding database...');

  await prisma.user.upsert({
    where:  { email: 'admin@gmail.com' },
    update: {},
    create: {
      email:           'admin@gmail.com',
      passwordHash:    hash('12345678'),
      role:            Role.ADMIN,
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Super', lastName: 'Admin' } },
    },
  });
  console.log('  Admin -> admin@gmail.com / 12345678');

  await prisma.appSettings.upsert({
    where:  { key: 'COMMISSION_PCT' },
    update: {},
    create: {
      key:      'COMMISSION_PCT',
      value:    '15',
      category: 'PAYMENTS',
      isSecret: false,
    },
  });
  await prisma.appSettings.upsert({
    where:  { key: 'PLATFORM_FEE_PCT' },
    update: {},
    create: {
      key:      'PLATFORM_FEE_PCT',
      value:    '0',
      category: 'PAYMENTS',
      isSecret: false,
    },
  });
  console.log('  Settings -> COMMISSION_PCT=15 / PLATFORM_FEE_PCT=0');

  console.log('Seed done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
