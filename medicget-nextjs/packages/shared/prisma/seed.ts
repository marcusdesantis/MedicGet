import { PrismaClient, Role, AppointmentStatus, DayOfWeek, PaymentStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function main() {
  console.log('🌱  Seeding database…');

  // ── Clinic ───────────────────────────────────────────────────────────────────
  const clinicUser = await prisma.user.upsert({
    where:  { email: 'clinica@medicget.com' },
    update: {},
    create: {
      email: 'clinica@medicget.com', passwordHash: hash('clinica'), role: Role.CLINIC,
      profile: { create: { firstName: 'Clínica', lastName: 'Salud Plus', phone: '+34 91 000 1111' } },
      clinic:  { create: {
        name: 'Clínica Salud Plus', address: 'Calle Mayor 42', city: 'Madrid',
        country: 'España', phone: '+34 91 000 1111', email: 'info@saludplus.es',
        description: 'Centro médico multidisciplinar con más de 20 años de experiencia.',
      }},
    },
    include: { clinic: true },
  });
  const clinic = clinicUser.clinic!;
  console.log(`  ✓ Clinic  → ${clinicUser.email}`);

  // ── Doctors ──────────────────────────────────────────────────────────────────
  const doctorSeeds = [
    { email: 'medico@medicget.com', pw: 'medico', first: 'Carlos', last: 'López',
      specialty: 'Cardiología', exp: 15, price: 65, rating: 4.9, reviews: 312,
      bio: 'Cardiólogo con 15 años de experiencia en diagnóstico cardiovascular.',
      langs: ['Español', 'Inglés'],
      availability: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY],
    },
    { email: 'ana.garcia@medicget.com', pw: 'medico123', first: 'Ana', last: 'García',
      specialty: 'Pediatría', exp: 8, price: 55, rating: 4.7, reviews: 188,
      bio: 'Pediatra especializada en desarrollo infantil.',
      langs: ['Español'],
      availability: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
    },
    { email: 'luis.martinez@medicget.com', pw: 'medico123', first: 'Luis', last: 'Martínez',
      specialty: 'Traumatología', exp: 12, price: 70, rating: 4.8, reviews: 241,
      bio: 'Traumatólogo especialista en cirugía de rodilla y hombro.',
      langs: ['Español', 'Francés'],
      availability: [DayOfWeek.TUESDAY, DayOfWeek.THURSDAY],
    },
  ];

  const doctors: { id: string; userId: string }[] = [];
  for (const d of doctorSeeds) {
    const u = await prisma.user.upsert({
      where:  { email: d.email },
      update: {},
      create: {
        email: d.email, passwordHash: hash(d.pw), role: Role.DOCTOR,
        profile: { create: { firstName: d.first, lastName: d.last } },
        doctor: { create: {
          clinicId: clinic.id, specialty: d.specialty, experience: d.exp,
          pricePerConsult: d.price, bio: d.bio, languages: d.langs,
          rating: d.rating, reviewCount: d.reviews,
          availability: {
            create: d.availability.map((day) => ({
              dayOfWeek: day, startTime: '08:00', endTime: '18:00',
            })),
          },
        }},
      },
      include: { doctor: true },
    });
    doctors.push({ id: u.doctor!.id, userId: u.id });
    console.log(`  ✓ Doctor  → ${u.email}`);
  }

  // ── Patients ─────────────────────────────────────────────────────────────────
  const patientSeeds = [
    { email: 'paciente@medicget.com', pw: 'paciente', first: 'María', last: 'González',
      dob: new Date('1990-03-15'), blood: 'A+', allergies: ['Penicilina'] },
    { email: 'roberto.silva@example.com', pw: 'paciente123', first: 'Roberto', last: 'Silva',
      dob: new Date('1985-07-22'), blood: 'O+', allergies: [] },
    { email: 'carmen.ruiz@example.com', pw: 'paciente123', first: 'Carmen', last: 'Ruiz',
      dob: new Date('1978-11-08'), blood: 'B-', allergies: ['Aspirina'] },
  ];

  const patients: { id: string; userId: string }[] = [];
  for (const p of patientSeeds) {
    const u = await prisma.user.upsert({
      where:  { email: p.email },
      update: {},
      create: {
        email: p.email, passwordHash: hash(p.pw), role: Role.PATIENT,
        profile: { create: { firstName: p.first, lastName: p.last } },
        patient: { create: { dateOfBirth: p.dob, bloodType: p.blood, allergies: p.allergies } },
      },
      include: { patient: true },
    });
    patients.push({ id: u.patient!.id, userId: u.id });
    console.log(`  ✓ Patient → ${u.email}`);
  }

  // ── Appointments + Payments ───────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = (offset: number) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt; };

  const apptSeeds = [
    { pIdx: 0, dIdx: 0, date: d(0),   time: '09:00', status: AppointmentStatus.UPCOMING,  price: 65,  payStatus: PaymentStatus.PENDING },
    { pIdx: 1, dIdx: 0, date: d(0),   time: '10:00', status: AppointmentStatus.COMPLETED, price: 65,  payStatus: PaymentStatus.PAID    },
    { pIdx: 2, dIdx: 1, date: d(0),   time: '11:30', status: AppointmentStatus.ONGOING,   price: 55,  payStatus: PaymentStatus.PENDING },
    { pIdx: 0, dIdx: 1, date: d(-7),  time: '09:00', status: AppointmentStatus.COMPLETED, price: 55,  payStatus: PaymentStatus.PAID    },
    { pIdx: 1, dIdx: 2, date: d(-14), time: '16:00', status: AppointmentStatus.COMPLETED, price: 70,  payStatus: PaymentStatus.PAID    },
    { pIdx: 2, dIdx: 0, date: d(-3),  time: '10:30', status: AppointmentStatus.CANCELLED, price: 65,  payStatus: PaymentStatus.REFUNDED },
    { pIdx: 0, dIdx: 0, date: d(3),   time: '08:30', status: AppointmentStatus.UPCOMING,  price: 65,  payStatus: PaymentStatus.PENDING },
    { pIdx: 1, dIdx: 1, date: d(5),   time: '10:00', status: AppointmentStatus.PENDING,   price: 55,  payStatus: PaymentStatus.PENDING },
    { pIdx: 2, dIdx: 2, date: d(7),   time: '17:00', status: AppointmentStatus.PENDING,   price: 70,  payStatus: PaymentStatus.PENDING },
  ];

  for (const a of apptSeeds) {
    const appt = await prisma.appointment.create({
      data: {
        patientId: patients[a.pIdx].id,
        doctorId:  doctors[a.dIdx].id,
        clinicId:  clinic.id,
        date:      a.date,
        time:      a.time,
        status:    a.status,
        price:     a.price,
        payment: {
          create: {
            amount: a.price,
            status: a.payStatus,
            method: a.payStatus === PaymentStatus.PENDING ? PaymentMethod.PENDING : PaymentMethod.CARD,
            paidAt: a.payStatus === PaymentStatus.PAID ? new Date() : undefined,
          },
        },
      },
    });

    // Add review for completed appointments
    if (a.status === AppointmentStatus.COMPLETED) {
      await prisma.review.create({
        data: {
          appointmentId: appt.id,
          patientId:     patients[a.pIdx].id,
          doctorId:      doctors[a.dIdx].id,
          rating:        Math.floor(Math.random() * 2) + 4, // 4 or 5
          comment:       'Excelente atención, muy profesional.',
        },
      }).catch(() => { /* ignore duplicate */ });
    }
  }
  console.log(`  ✓ ${apptSeeds.length} appointments + payments seeded`);

  // ── Notifications ─────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: patients[0].userId, type: 'APPOINTMENT_CONFIRMED',  title: 'Cita confirmada',      message: 'Tu cita del próximo lunes ha sido confirmada.',   isRead: false },
      { userId: patients[0].userId, type: 'APPOINTMENT_REMINDER',   title: 'Recordatorio de cita', message: 'Tienes una cita mañana a las 09:00.',              isRead: true  },
      { userId: doctors[0].userId,  type: 'REVIEW_RECEIVED',        title: 'Nueva reseña',         message: 'Un paciente ha dejado una reseña de 5 estrellas.', isRead: false },
      { userId: clinicUser.id,      type: 'PAYMENT_RECEIVED',       title: 'Pago recibido',        message: 'Se ha procesado un pago de €65.',                  isRead: false },
    ],
    skipDuplicates: true,
  });
  console.log('  ✓ Notifications seeded');

  console.log('\n✅  Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  clinica@medicget.com   / clinica');
  console.log('  medico@medicget.com    / medico');
  console.log('  paciente@medicget.com  / paciente');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
