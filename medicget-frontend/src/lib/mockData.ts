/**
 * mockData — all static mock/demo data in one place.
 *
 * Pages import data from here instead of declaring constants inline.
 * When real API integration arrives, replace these exports with API calls
 * one at a time without touching page components.
 */

// ─── Shared types ────────────────────────────────────────────────────────────

export interface MockAppointment {
  id:        number;
  patient:   string;
  doctor:    string;
  specialty: string;
  date:      string;
  time:      string;
  status:    string;
  avatar:    string;
  notes?:    string;
  age?:      number;
  type?:     string;
}

export interface MockDoctor {
  id:          number;
  name:        string;
  specialty:   string;
  experience:  number;
  price:       number;
  rating:      number;
  reviews?:    number;
  distance?:   number;
  available:   boolean;
  patients?:   number;
  avatar:      string;
}

export interface MockPatient {
  id:        number;
  name:      string;
  age:       number;
  email:     string;
  phone:     string;
  lastVisit: string;
  doctor:    string;
  status:    string;
  avatar:    string;
  visits?:   number;
  condition?: string;
}

export interface MockRecord {
  id:      number;
  title:   string;
  doctor:  string;
  date:    string;
  type:    string;
  urgent?: boolean;
}

export interface MockTransaction {
  id:      number;
  patient: string;
  doctor:  string;
  amount:  number;
  date:    string;
  method:  string;
  status:  string;
}

export interface MockSpecialty {
  id:           number;
  name:         string;
  doctors:      number;
  appointments: number;
  color:        string;
  active:       boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

// ─── Patient mock data ───────────────────────────────────────────────────────

export const patientUpcomingAppointments: MockAppointment[] = [
  { id: 1, patient: 'Ana García', doctor: 'Dr. Martínez', specialty: 'Cardiología', date: 'Hoy',    time: '15:30', status: 'upcoming',  avatar: 'MA', notes: 'Revisión anual' },
  { id: 2, patient: 'Ana García', doctor: 'Dra. Sánchez', specialty: 'Dermatología', date: 'Mañana', time: '10:00', status: 'pending',   avatar: 'SA', notes: 'Consulta rutinaria' },
  { id: 3, patient: 'Ana García', doctor: 'Dr. Pérez',    specialty: 'Traumatología', date: '05 May', time: '09:00', status: 'upcoming', avatar: 'PE', notes: 'Seguimiento' },
];

export const patientAllAppointments: MockAppointment[] = [
  ...patientUpcomingAppointments,
  { id: 4, patient: 'Ana García', doctor: 'Dr. Díaz',   specialty: 'Medicina General', date: '10 Abr 2026', time: '11:30', status: 'completed', avatar: 'RD', notes: 'Seguimiento tensión' },
  { id: 5, patient: 'Ana García', doctor: 'Dra. Gil',   specialty: 'Ginecología',     date: '05 Mar 2026', time: '09:00', status: 'completed', avatar: 'MG', notes: 'Revisión anual' },
  { id: 6, patient: 'Ana García', doctor: 'Dr. Torres', specialty: 'Traumatología',   date: '15 Mar 2026', time: '16:00', status: 'cancelled', avatar: 'JT', notes: 'Dolor rodilla' },
];

export const nearbyDoctors: Pick<MockDoctor, 'id' | 'name' | 'specialty' | 'rating' | 'reviews' | 'price' | 'distance' | 'avatar'>[] = [
  { id: 1, name: 'Dra. Laura Vega',    specialty: 'Pediatría',       rating: 4.9, reviews: 128, price: 45, distance: 0.3, avatar: 'LV' },
  { id: 2, name: 'Dr. Roberto Díaz',   specialty: 'Medicina General', rating: 4.7, reviews: 214, price: 35, distance: 0.8, avatar: 'RD' },
  { id: 3, name: 'Dra. Marta Gil',     specialty: 'Ginecología',      rating: 4.8, reviews: 97,  price: 60, distance: 1.2, avatar: 'MG' },
];

export const searchDoctors: MockDoctor[] = [
  { id: 1, name: 'Dr. Carlos Martínez', specialty: 'Cardiología',     rating: 4.9, reviews: 312, price: 65, distance: 0.3, experience: 15, avatar: 'CM', available: true  },
  { id: 2, name: 'Dra. Laura Vega',     specialty: 'Pediatría',       rating: 4.8, reviews: 128, price: 45, distance: 0.8, experience: 8,  avatar: 'LV', available: true  },
  { id: 3, name: 'Dr. Roberto Díaz',    specialty: 'Medicina General', rating: 4.6, reviews: 214, price: 35, distance: 1.1, experience: 12, avatar: 'RD', available: false },
  { id: 4, name: 'Dra. Marta Gil',      specialty: 'Ginecología',      rating: 4.8, reviews: 97,  price: 60, distance: 1.4, experience: 10, avatar: 'MG', available: true  },
  { id: 5, name: 'Dr. Juan Torres',     specialty: 'Traumatología',    rating: 4.7, reviews: 188, price: 55, distance: 2.0, experience: 20, avatar: 'JT', available: true  },
  { id: 6, name: 'Dra. Sofía Ruiz',    specialty: 'Dermatología',     rating: 4.5, reviews: 74,  price: 50, distance: 2.5, experience: 6,  avatar: 'SR', available: false },
];

export const medicalRecords: MockRecord[] = [
  { id: 1, title: 'Análisis de sangre completo', doctor: 'Dr. Martínez', date: '10 Abr 2026', type: 'Laboratorio', urgent: false },
  { id: 2, title: 'Electrocardiograma',          doctor: 'Dr. Martínez', date: '10 Abr 2026', type: 'Diagnóstico', urgent: true  },
  { id: 3, title: 'Radiografía tórax',           doctor: 'Dr. Pérez',    date: '20 Mar 2026', type: 'Imagen',      urgent: false },
  { id: 4, title: 'Consulta dermatológica',      doctor: 'Dra. Sánchez', date: '05 Feb 2026', type: 'Consulta',    urgent: false },
  { id: 5, title: 'Revisión tensión arterial',   doctor: 'Dr. Díaz',     date: '15 Ene 2026', type: 'Consulta',    urgent: false },
];

// ─── Doctor mock data ────────────────────────────────────────────────────────

export const todaySchedule: MockAppointment[] = [
  { id: 1, patient: 'María González', age: 34, time: '09:00', type: 'Consulta',       status: 'done',    avatar: 'MG', doctor: 'Dr. López', specialty: 'Cardiología', date: 'Hoy' },
  { id: 2, patient: 'Pedro Romero',   age: 58, time: '10:00', type: 'Revisión',        status: 'done',    avatar: 'PR', doctor: 'Dr. López', specialty: 'Cardiología', date: 'Hoy' },
  { id: 3, patient: 'Ana Torres',     age: 27, time: '11:30', type: 'Primera visita',  status: 'current', avatar: 'AT', doctor: 'Dr. López', specialty: 'Cardiología', date: 'Hoy' },
  { id: 4, patient: 'Luis Herrera',   age: 45, time: '12:30', type: 'Seguimiento',     status: 'pending', avatar: 'LH', doctor: 'Dr. López', specialty: 'Cardiología', date: 'Hoy' },
  { id: 5, patient: 'Carmen Ortiz',   age: 62, time: '16:00', type: 'Consulta',        status: 'pending', avatar: 'CO', doctor: 'Dr. López', specialty: 'Cardiología', date: 'Hoy' },
];

export const doctorAllAppointments: MockAppointment[] = [
  { id: 1, patient: 'María González', age: 34, date: '28 Abr 2026', time: '09:00', type: 'Revisión anual',  status: 'pending',   avatar: 'MG', doctor: 'Dr. López', specialty: 'Cardiología' },
  { id: 2, patient: 'Pedro Romero',   age: 58, date: '28 Abr 2026', time: '10:00', type: 'Seguimiento',     status: 'completed', avatar: 'PR', doctor: 'Dr. López', specialty: 'Cardiología' },
  { id: 3, patient: 'Ana Torres',     age: 27, date: '28 Abr 2026', time: '11:30', type: 'Primera visita',  status: 'pending',   avatar: 'AT', doctor: 'Dr. López', specialty: 'Cardiología' },
  { id: 4, patient: 'Luis Herrera',   age: 45, date: '29 Abr 2026', time: '12:30', type: 'Consulta',        status: 'pending',   avatar: 'LH', doctor: 'Dr. López', specialty: 'Cardiología' },
  { id: 5, patient: 'Carmen Ortiz',   age: 62, date: '30 Abr 2026', time: '16:00', type: 'Consulta',        status: 'cancelled', avatar: 'CO', doctor: 'Dr. López', specialty: 'Cardiología' },
  { id: 6, patient: 'Javier Méndez',  age: 41, date: '05 May 2026', time: '09:30', type: 'Seguimiento',     status: 'pending',   avatar: 'JM', doctor: 'Dr. López', specialty: 'Cardiología' },
];

export const doctorPatients: MockPatient[] = [
  { id: 1, name: 'María González', age: 34, email: '', phone: '', lastVisit: '28 Abr 2026', doctor: 'Dr. López', status: 'active',   avatar: 'MG', visits: 8,  condition: 'Hipertensión'      },
  { id: 2, name: 'Pedro Romero',   age: 58, email: '', phone: '', lastVisit: '15 Abr 2026', doctor: 'Dr. López', status: 'active',   avatar: 'PR', visits: 15, condition: 'Diabetes tipo 2'   },
  { id: 3, name: 'Ana Torres',     age: 27, email: '', phone: '', lastVisit: '28 Abr 2026', doctor: 'Dr. López', status: 'new',      avatar: 'AT', visits: 1,  condition: 'Primera visita'    },
  { id: 4, name: 'Luis Herrera',   age: 45, email: '', phone: '', lastVisit: '01 Abr 2026', doctor: 'Dr. López', status: 'active',   avatar: 'LH', visits: 6,  condition: 'Cardiopatía leve'  },
  { id: 5, name: 'Carmen Ortiz',   age: 62, email: '', phone: '', lastVisit: '10 Mar 2026', doctor: 'Dr. López', status: 'inactive', avatar: 'CO', visits: 22, condition: 'Arritmia'          },
  { id: 6, name: 'Javier Méndez',  age: 41, email: '', phone: '', lastVisit: '20 Mar 2026', doctor: 'Dr. López', status: 'active',   avatar: 'JM', visits: 4,  condition: 'Seguimiento EKG'   },
];

export const weeklyChartData: ChartDataPoint[] = [
  { label: 'Lun', value: 8  },
  { label: 'Mar', value: 12 },
  { label: 'Mié', value: 7  },
  { label: 'Jue', value: 10 },
  { label: 'Vie', value: 14 },
  { label: 'Sáb', value: 5  },
  { label: 'Dom', value: 0  },
];

// ─── Clinic mock data ────────────────────────────────────────────────────────

export const clinicDoctors: MockDoctor[] = [
  { id: 1, name: 'Dr. Jorge Torres',   specialty: 'Cardiología',   experience: 15, price: 65, rating: 4.9, patients: 248, avatar: 'JT', available: true  },
  { id: 2, name: 'Dra. Laura Vega',    specialty: 'Pediatría',     experience: 8,  price: 45, rating: 4.8, patients: 186, avatar: 'LV', available: true  },
  { id: 3, name: 'Dr. Marcos Ruiz',    specialty: 'Dermatología',  experience: 6,  price: 50, rating: 4.7, patients: 134, avatar: 'MR', available: false },
  { id: 4, name: 'Dra. Sofía Blanco',  specialty: 'Ginecología',   experience: 12, price: 60, rating: 4.8, patients: 201, avatar: 'SB', available: true  },
  { id: 5, name: 'Dr. Andrés Mora',    specialty: 'Traumatología', experience: 20, price: 55, rating: 4.6, patients: 312, avatar: 'AM', available: true  },
  { id: 6, name: 'Dra. Elena Castro',  specialty: 'Neurología',    experience: 10, price: 70, rating: 4.9, patients: 98,  avatar: 'EC', available: false },
];

export const clinicAppointments: MockAppointment[] = [
  { id: 1, patient: 'Laura M.',   doctor: 'Dr. Torres',  specialty: 'Cardiología',   date: '28 Abr', time: '09:00', status: 'completed', avatar: 'LM' },
  { id: 2, patient: 'Carlos R.',  doctor: 'Dra. Vega',   specialty: 'Pediatría',     date: '28 Abr', time: '10:30', status: 'ongoing',   avatar: 'CR' },
  { id: 3, patient: 'Isabel P.',  doctor: 'Dr. Ruiz',    specialty: 'Dermatología',  date: '28 Abr', time: '11:00', status: 'pending',   avatar: 'IP' },
  { id: 4, patient: 'Tomás G.',   doctor: 'Dr. Torres',  specialty: 'Cardiología',   date: '28 Abr', time: '12:00', status: 'pending',   avatar: 'TG' },
  { id: 5, patient: 'Rosa M.',    doctor: 'Dra. Blanco', specialty: 'Ginecología',   date: '29 Abr', time: '09:00', status: 'pending',   avatar: 'RM' },
  { id: 6, patient: 'Álvaro T.',  doctor: 'Dr. Mora',    specialty: 'Traumatología', date: '29 Abr', time: '10:00', status: 'cancelled', avatar: 'AT' },
  { id: 7, patient: 'Elena R.',   doctor: 'Dra. Vega',   specialty: 'Pediatría',     date: '30 Abr', time: '11:00', status: 'pending',   avatar: 'ER' },
  { id: 8, patient: 'Pedro S.',   doctor: 'Dr. Torres',  specialty: 'Cardiología',   date: '30 Abr', time: '15:30', status: 'pending',   avatar: 'PS' },
];

export const clinicPatients: MockPatient[] = [
  { id: 1, name: 'Laura Martín', age: 34, email: 'laura.m@email.com',   phone: '+34 611 222 333', lastVisit: '28 Abr 2026', doctor: 'Dr. Torres',  status: 'active',   avatar: 'LM' },
  { id: 2, name: 'Carlos Ruiz',  age: 45, email: 'carlos.r@email.com',  phone: '+34 622 333 444', lastVisit: '25 Abr 2026', doctor: 'Dra. Vega',   status: 'active',   avatar: 'CR' },
  { id: 3, name: 'Isabel Pérez', age: 28, email: 'isabel.p@email.com',  phone: '+34 633 444 555', lastVisit: '20 Abr 2026', doctor: 'Dr. Ruiz',    status: 'new',      avatar: 'IP' },
  { id: 4, name: 'Tomás García', age: 56, email: 'tomas.g@email.com',   phone: '+34 644 555 666', lastVisit: '10 Abr 2026', doctor: 'Dr. Torres',  status: 'active',   avatar: 'TG' },
  { id: 5, name: 'Rosa Moreno',  age: 42, email: 'rosa.m@email.com',    phone: '+34 655 666 777', lastVisit: '05 Abr 2026', doctor: 'Dra. Blanco', status: 'inactive', avatar: 'RM' },
  { id: 6, name: 'Álvaro Torres',age: 33, email: 'alvaro.t@email.com',  phone: '+34 666 777 888', lastVisit: '28 Mar 2026', doctor: 'Dr. Mora',    status: 'active',   avatar: 'AT' },
];

export const transactions: MockTransaction[] = [
  { id: 1, patient: 'Laura Martín', doctor: 'Dr. Torres',  amount: 65, date: '28 Abr 2026', method: 'Tarjeta', status: 'paid'     },
  { id: 2, patient: 'Carlos Ruiz',  doctor: 'Dra. Vega',   amount: 45, date: '28 Abr 2026', method: 'Efectivo',status: 'paid'     },
  { id: 3, patient: 'Isabel Pérez', doctor: 'Dr. Ruiz',    amount: 50, date: '28 Abr 2026', method: 'Tarjeta', status: 'pending'  },
  { id: 4, patient: 'Tomás García', doctor: 'Dr. Torres',  amount: 65, date: '27 Abr 2026', method: 'Tarjeta', status: 'paid'     },
  { id: 5, patient: 'Rosa Moreno',  doctor: 'Dra. Blanco', amount: 60, date: '27 Abr 2026', method: 'Seguro',  status: 'paid'     },
  { id: 6, patient: 'Álvaro Torres',doctor: 'Dr. Mora',    amount: 55, date: '26 Abr 2026', method: 'Tarjeta', status: 'refunded' },
  { id: 7, patient: 'Carmen López', doctor: 'Dra. Vega',   amount: 45, date: '25 Abr 2026', method: 'Efectivo',status: 'paid'     },
];

export const initialSpecialties: MockSpecialty[] = [
  { id: 1, name: 'Cardiología',  doctors: 2, appointments: 312, color: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400',    active: true  },
  { id: 2, name: 'Pediatría',    doctors: 1, appointments: 214, color: 'bg-blue-100   text-blue-600   dark:bg-blue-900/30   dark:text-blue-400',   active: true  },
  { id: 3, name: 'Dermatología', doctors: 1, appointments: 156, color: 'bg-amber-100  text-amber-600  dark:bg-amber-900/30  dark:text-amber-400',  active: false },
  { id: 4, name: 'Ginecología',  doctors: 1, appointments: 188, color: 'bg-pink-100   text-pink-600   dark:bg-pink-900/30   dark:text-pink-400',   active: true  },
  { id: 5, name: 'Traumatología',doctors: 1, appointments: 142, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', active: true  },
  { id: 6, name: 'Neurología',   doctors: 1, appointments: 98,  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', active: false },
];

export const monthlyChartData: ChartDataPoint[] = [
  { label: 'Oct', value: 14200 },
  { label: 'Nov', value: 16800 },
  { label: 'Dic', value: 12100 },
  { label: 'Ene', value: 18400 },
  { label: 'Feb', value: 20100 },
  { label: 'Mar', value: 22800 },
  { label: 'Abr', value: 21400 },
];

export const monthlyAppointmentsData: ChartDataPoint[] = [
  { label: 'Oct', value: 98  },
  { label: 'Nov', value: 112 },
  { label: 'Dic', value: 84  },
  { label: 'Ene', value: 128 },
  { label: 'Feb', value: 134 },
  { label: 'Mar', value: 156 },
  { label: 'Abr', value: 148 },
];

export const monthlyPatientsData: ChartDataPoint[] = [
  { label: 'Oct', value: 72  },
  { label: 'Nov', value: 88  },
  { label: 'Dic', value: 61  },
  { label: 'Ene', value: 104 },
  { label: 'Feb', value: 118 },
  { label: 'Mar', value: 132 },
  { label: 'Abr', value: 124 },
];

export const specialtyDistribution = [
  { name: 'Cardiología',  value: 38, color: '#6366f1' },
  { name: 'Pediatría',    value: 28, color: '#22c55e' },
  { name: 'Dermatología', value: 16, color: '#f59e0b' },
  { name: 'Ginecología',  value: 12, color: '#ec4899' },
  { name: 'Otros',        value: 6,  color: '#94a3b8' },
];

export const MEDICAL_SPECIALTIES = [
  'Cardiología', 'Pediatría', 'Medicina General', 'Ginecología',
  'Traumatología', 'Dermatología', 'Neurología', 'Oftalmología',
];

export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  Tarjeta: '💳',
  Efectivo: '💵',
  Seguro: '🏥',
};
