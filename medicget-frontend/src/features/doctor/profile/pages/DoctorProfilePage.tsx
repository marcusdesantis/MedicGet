import { useState } from 'react';
import { Camera, Save, Plus, X } from 'lucide-react';
import { PageHeader }   from '@/components/ui/PageHeader';
import { SectionCard }  from '@/components/ui/SectionCard';
import { Avatar }       from '@/components/ui/Avatar';
import { StatusBadge }  from '@/components/ui/StatusBadge';
import { specialtyStatusMap } from '@/lib/statusConfig';

const SPECIALTIES = ['Cardiología', 'Pediatría', 'Medicina General', 'Ginecología', 'Traumatología', 'Dermatología', 'Neurología', 'Oftalmología'];

export function DoctorProfilePage() {
  const [form, setForm] = useState({
    name: 'Dr. Carlos López',
    email: 'carlos.lopez@medicget.com',
    phone: '+34 611 222 333',
    specialty: 'Cardiología',
    experience: '15',
    price: '65',
    bio: 'Cardiólogo con más de 15 años de experiencia en diagnóstico y tratamiento de enfermedades cardiovasculares. Especializado en ecocardiografía y cardiología intervencionista.',
    consultDuration: '30',
  });
  const [languages, setLanguages] = useState(['Español', 'Inglés']);
  const [newLang, setNewLang] = useState('');

  const handle = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Mi perfil médico" subtitle="Gestiona tu información profesional" />

      {/* Avatar + verification */}
      <SectionCard>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar initials="CL" size="xl" shape="rounded" variant="teal" />
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-teal-600 rounded-full
                               flex items-center justify-center text-white shadow-md hover:bg-teal-700 transition">
              <Camera size={13} />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{form.name}</h3>
            <p className="text-sm text-slate-400">{form.specialty} · {form.experience} años de experiencia</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status="active" statusMap={specialtyStatusMap} size="sm" />
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                ★ 4.9 (312 reseñas)
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Professional info */}
      <SectionCard title="Información profesional" bodyClass="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Nombre completo', key: 'name' },
            { label: 'Email profesional', key: 'email' },
            { label: 'Teléfono', key: 'phone' },
            { label: 'Años de experiencia', key: 'experience', type: 'number' },
            { label: 'Precio por consulta (€)', key: 'price', type: 'number' },
            { label: 'Duración consulta (min)', key: 'consultDuration', type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
              <input
                type={type ?? 'text'}
                value={form[key as keyof typeof form]}
                onChange={(e) => handle(key, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                           bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Especialidad</label>
            <select
              value={form.specialty}
              onChange={(e) => handle('specialty', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Biografía profesional</label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => handle('bio', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white resize-none
                         focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Idiomas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {languages.map((lang) => (
              <span key={lang} className="flex items-center gap-1.5 text-xs bg-teal-100 dark:bg-teal-900/30
                                          text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-full font-medium">
                {lang}
                <button onClick={() => setLanguages(languages.filter((l) => l !== lang))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              placeholder="Añadir idioma..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLang.trim()) {
                  setLanguages([...languages, newLang.trim()]);
                  setNewLang('');
                }
              }}
            />
            <button
              onClick={() => { if (newLang.trim()) { setLanguages([...languages, newLang.trim()]); setNewLang(''); } }}
              className="p-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700
                           text-white font-medium text-sm rounded-xl shadow-sm transition">
          <Save size={15} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
