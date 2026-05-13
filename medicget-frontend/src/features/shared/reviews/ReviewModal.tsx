/**
 * ReviewModal — modal para que el paciente califique al médico después
 * de una cita COMPLETED. 1-5 estrellas + comentario opcional + flag
 * "publicar como reseña pública".
 *
 * El backend rechaza si:
 *   • La cita no está COMPLETED
 *   • Ya existe una review para esa cita
 *   • El caller no es el paciente dueño
 */

import { useState } from 'react';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast }       from 'sonner';
import { Avatar }      from '@/components/ui/Avatar';
import { Alert }       from '@/components/ui/Alert';
import { appointmentsApi, type AppointmentDto } from '@/lib/api';

interface ReviewModalProps {
  appointment: AppointmentDto;
  onClose:     () => void;
  onSaved:     () => void;
}

export function ReviewModal({ appointment, onClose, onSaved }: ReviewModalProps) {
  const [rating,  setRating]  = useState<number>(0);
  const [hover,   setHover]   = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isPublic, setPublic] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const profile = appointment.doctor?.user?.profile;
  const docName = `Dr. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || 'DR';

  const submit = async () => {
    if (rating === 0) {
      setError('Elegí cuántas estrellas le ponés.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await appointmentsApi.createReview(appointment.id, {
        rating,
        comment: comment.trim() || undefined,
        isPublic,
      });
      toast.success('¡Gracias por tu reseña!');
      onSaved();
    } catch (err: unknown) {
      // El backend devuelve un payload tipado `{ ok: false, error: { code, message, details? } }`.
      // Surface el mensaje real al usuario y, si ya existe una reseña para esta
      // cita (CONFLICT), cerramos el modal y refrescamos el listado para que
      // el botón "Calificar" desaparezca.
      const errObj = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })?.response?.data?.error;
      const code = errObj?.code;
      const msg  = errObj?.message ?? 'No se pudo enviar la reseña';

      if (code === 'CONFLICT') {
        toast.info('Esta cita ya tiene una reseña.');
        onSaved();
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Copy "humanizado" según cuántas estrellas haya seleccionadas
  const ratingCopy = (n: number): string => {
    if (n === 0) return 'Tocá una estrella';
    if (n === 1) return 'Muy mala experiencia';
    if (n === 2) return 'Por debajo de lo esperado';
    if (n === 3) return 'Aceptable';
    if (n === 4) return 'Buena experiencia';
    return '¡Excelente!';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">Calificar consulta</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Doctor info */}
          <div className="flex items-center gap-3">
            <Avatar
              initials={initials}
              imageUrl={profile?.avatarUrl ?? null}
              size="md"
              shape="rounded"
              variant="blue"
            />
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{docName}</p>
              <p className="text-xs text-slate-500">
                {appointment.doctor?.specialty} · {new Date(appointment.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Star rating */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">¿Cómo fue tu experiencia?</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1 transition transform hover:scale-110"
                    aria-label={`${n} estrellas`}
                  >
                    <Star
                      size={32}
                      className={active ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 h-4">{ratingCopy(hover || rating)}</p>
          </div>

          {/* Comment */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Comentario (opcional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Contale a otros pacientes cómo te atendió, qué destacarías…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{comment.length}/500</p>
          </div>

          {/* Public toggle */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setPublic(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Publicar como reseña pública</p>
              <p className="text-xs text-slate-500">
                {isPublic
                  ? 'Otros pacientes verán tu reseña en el perfil del médico (sólo nombre y inicial del apellido).'
                  : 'Sólo el médico verá tu reseña — sirve para feedback privado.'}
              </p>
            </div>
          </label>

          {error && <Alert variant="error">{error}</Alert>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || rating === 0}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Enviar reseña
          </button>
        </div>
      </div>
    </div>
  );
}
