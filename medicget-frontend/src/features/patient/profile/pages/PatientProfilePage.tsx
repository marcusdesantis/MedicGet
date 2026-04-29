import { useState }     from 'react';
import { User, Mail, Phone, MapPin, Save, Camera } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { useAuth }      from '@/context/AuthContext';

interface FieldDef {
  label:  string;
  key:    keyof ProfileForm;
  type?:  string;
  icon?:  React.ElementType;
  span?:  boolean;
}

interface ProfileForm {
  name:      string;
  email:     string;
  phone:     string;
  birthdate: string;
  address:   string;
  bloodType: string;
  height:    string;
  weight:    string;
}

const PERSONAL_FIELDS: FieldDef[] = [
  { label: 'Nombre completo',    key: 'name',      icon: User  },
  { label: 'Correo electrónico', key: 'email',     icon: Mail  },
  { label: 'Teléfono',           key: 'phone',     icon: Phone },
  { label: 'Fecha de nacimiento',key: 'birthdate', type: 'date' },
  { label: 'Dirección',          key: 'address',   icon: MapPin, span: true },
];

const HEALTH_FIELDS: FieldDef[] = [
  { label: 'Grupo sanguíneo', key: 'bloodType' },
  { label: 'Altura (cm)',     key: 'height'    },
  { label: 'Peso (kg)',       key: 'weight'    },
];

export function PatientProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    name:      user?.name ?? '',
    email:     'ana.garcia@email.com',
    phone:     '+34 612 345 678',
    birthdate: '1990-03-15',
    address:   'Calle Mayor 12, Madrid',
    bloodType: 'A+',
    height:    '165',
    weight:    '62',
  });

  const handle = (key: keyof ProfileForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Mi perfil" subtitle="Gestiona tu información personal" />

      {/* Avatar block */}
      <SectionCard>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar initials="AG" size="xl" shape="rounded" variant="blue" />
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 rounded-full
                               flex items-center justify-center text-white shadow-md hover:bg-blue-700 transition">
              <Camera size={13} />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{form.name}</h3>
            <p className="text-sm text-slate-400">Paciente · ID #00142</p>
            <span className="inline-block mt-1.5 text-xs bg-emerald-100 text-emerald-700
                             dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
              Perfil verificado
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Personal info */}
      <SectionCard title="Información personal">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PERSONAL_FIELDS.map(({ label, key, type, icon: Icon, span }) => (
            <div key={key} className={span ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
              <div className="relative">
                {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                <input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={(e) => handle(key, e.target.value)}
                  className={`
                    w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                    bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${Icon ? 'pl-9 pr-3' : 'px-3'}
                  `}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Health info */}
      <SectionCard title="Datos de salud">
        <div className="grid grid-cols-3 gap-4">
          {HEALTH_FIELDS.map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => handle(key, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                           bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                           text-white font-medium text-sm rounded-xl shadow-sm transition">
          <Save size={15} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
