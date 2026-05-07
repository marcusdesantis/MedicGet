/**
 * /medicos/:id — public profile page.
 *
 *  Hero block (avatar + name + specialty + rating + price + book CTA)
 *  ──────────────────────────────────────────────────────
 *  Bio                                       │ Modalidades
 *  Idiomas                                   │ "Reservar" CTA
 *  Reseñas (las 3 mejores)                   │ "Iniciá sesión" o
 *                                            │ "Ver disponibilidad"
 *
 * UX choices:
 *  • CTA conditional: anonymous → /login?next=/patient/doctor/:id;
 *    logged in patient → /patient/doctor/:id (booking flow);
 *    logged in clinic/doctor → just shows "Ya estás logueado".
 *  • Reviews are read-only — only patients with completed appointments can
 *    write reviews, that lives elsewhere.
 *  • No email/phone exposed — the platform owns the relationship.
 *  • Sticky right column on desktop so the booking CTA is always visible.
 */

import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, Video, Building2, MessageSquare, Globe2, Clock,
  Stethoscope, ShieldCheck, Loader2, Calendar, ArrowRight,
} from 'lucide-react';
import { useApi }   from '@/hooks/useApi';
import { useAuth }  from '@/context/AuthContext';
import { Avatar }   from '@/components/ui/Avatar';
import { Alert }    from '@/components/ui/Alert';
import { doctorsApi, type DoctorDto } from '@/lib/api';

interface ReviewSummary {
  id:        string;
  rating:    number;
  comment?:  string;
  createdAt: string;
  patient?:  { user?: { profile?: { firstName?: string; lastName?: string } } };
}

export function PublicDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const { state, refetch } = useApi<DoctorDto & { reviews?: ReviewSummary[] }>(
    () => doctorsApi.getById(id!),
    [id],
  );

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error" action={
          <button onClick={refetch} className="text-sm font-medium underline">Reintentar</button>
        }>{state.error.message}</Alert>
      </div>
    );
  }

  const d = state.data;
  const profile  = d.user.profile;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR';
  const fullName = `Dr. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();

  // Auth-aware booking CTA
  const handleReserve = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/patient/doctor/${d.id}`)}`);
      return;
    }
    if (user?.role === 'patient') {
      navigate(`/patient/doctor/${d.id}`);
    } else {
      // doctor / clinic / admin — they can't book themselves
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/medicos" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300">
            <ArrowLeft size={16} /> <span className="text-sm font-medium">Especialistas</span>
          </Link>
          <Link to="/" className="font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300">MedicGet</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Hero block */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <Avatar
              initials={initials}
              imageUrl={profile?.avatarUrl ?? null}
              size="xl"
              shape="rounded"
              variant="auto"
              alt={fullName}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{fullName}</h1>
              <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 mt-1">
                <Stethoscope size={15} /> {d.specialty}
              </p>

              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                {d.reviewCount > 0 ? (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{d.rating.toFixed(1)}</span>
                    <span>· {d.reviewCount} {d.reviewCount === 1 ? 'reseña' : 'reseñas'}</span>
                  </div>
                ) : (
                  <span className="text-xs">Aún sin reseñas</span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> {d.consultDuration} min por consulta
                </span>
                {d.experience > 0 && (
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={13} /> {d.experience} años de experiencia
                  </span>
                )}
              </div>

              {d.clinic && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                  <Building2 size={13} /> {d.clinic.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — content */}
          <div className="lg:col-span-2 space-y-6">
            {d.bio && (
              <Block title="Sobre el especialista">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{d.bio}</p>
              </Block>
            )}

            <Block title="Modalidades de atención">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {d.modalities.includes('ONLINE') && (
                  <ModalityChip icon={Video} title="Videollamada" subtitle="Consulta online por video" tone="blue" />
                )}
                {d.modalities.includes('PRESENCIAL') && (
                  <ModalityChip icon={Building2} title="Presencial" subtitle="En consultorio físico" tone="rose" />
                )}
                {d.modalities.includes('CHAT') && (
                  <ModalityChip icon={MessageSquare} title="Chat en vivo" subtitle="Mensajería en tiempo real" tone="emerald" />
                )}
              </div>
            </Block>

            {d.languages && d.languages.length > 0 && (
              <Block title="Idiomas">
                <div className="flex flex-wrap gap-2">
                  {d.languages.map((lang) => (
                    <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                      <Globe2 size={12} /> {lang}
                    </span>
                  ))}
                </div>
              </Block>
            )}

            {d.reviews && d.reviews.length > 0 && (
              <Block title="Reseñas de pacientes">
                <div className="space-y-4">
                  {d.reviews.slice(0, 5).map((r) => {
                    const rProfile = r.patient?.user?.profile;
                    const rName = `${rProfile?.firstName ?? 'Paciente'} ${rProfile?.lastName?.[0] ?? ''}.`.trim();
                    return (
                      <div key={r.id} className="border-l-2 border-blue-200 dark:border-blue-900 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}
                            />
                          ))}
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">{rName}</span>
                          <span className="text-xs text-slate-400">
                            · {new Date(r.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{r.comment}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Block>
            )}
          </div>

          {/* Right — sticky CTA */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 shadow-lg shadow-blue-600/20">
                <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">Consulta desde</p>
                <p className="text-4xl font-bold mt-1">${d.pricePerConsult.toFixed(2)}</p>
                <p className="text-xs text-blue-100 mt-1">por consulta · {d.consultDuration} min</p>

                <button
                  onClick={handleReserve}
                  className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-5 py-3 rounded-xl text-sm transition shadow-sm"
                >
                  {isAuthenticated && user?.role === 'patient' ? (
                    <><Calendar size={15} /> Ver disponibilidad y reservar</>
                  ) : isAuthenticated ? (
                    <>Iniciá sesión como paciente</>
                  ) : (
                    <><Calendar size={15} /> Reservar cita <ArrowRight size={13} /></>
                  )}
                </button>

                {!isAuthenticated && (
                  <p className="text-[11px] text-blue-100 mt-3 text-center">
                    Necesitás una cuenta de paciente para reservar.{' '}
                    <Link to="/register" className="underline font-semibold">Registrate gratis</Link>.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">Por qué reservar acá</p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Médico verificado por el equipo de MedicGet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Pago seguro con cifrado y reembolso si cancelás con 24h+</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Recordatorios automáticos por email</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="font-bold text-slate-800 dark:text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}

function ModalityChip({ icon: Icon, title, subtitle, tone }: {
  icon:     typeof Video;
  title:    string;
  subtitle: string;
  tone:     'blue' | 'rose' | 'emerald';
}) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900 text-blue-600',
    rose:    'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900 text-rose-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900 text-emerald-600',
  };
  return (
    <div className={`rounded-xl p-3 border ${colors[tone]}`}>
      <Icon size={18} />
      <p className="font-semibold text-slate-800 dark:text-white text-sm mt-2">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
