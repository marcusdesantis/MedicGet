/**
 * ChatImageGallery — muestra todas las imágenes que se compartieron
 * en el chat de una cita en grid + lightbox para verlas grandes.
 *
 * Sólo se renderiza si hay >= 1 imagen. Si la cita no tiene chat (no
 * es modalidad CHAT) tampoco aparece — el caller decide cuándo
 * mostrarla.
 *
 * Reutiliza `chatApi.list(appointmentId)` así no tocamos el backend.
 * En threads largos puede traer muchos mensajes pero el filtrado a
 * imágenes es client-side y barato.
 */

import { useEffect, useState } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { chatApi, type ChatMessageDto } from '@/lib/api';

interface ImageItem {
  url:       string;
  name:      string;
  createdAt: string;
}

interface ChatImageGalleryProps {
  appointmentId: string;
}

export function ChatImageGallery({ appointmentId }: ChatImageGalleryProps) {
  const [items,   setItems]   = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [active,  setActive]  = useState<number | null>(null); // índice del lightbox

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatApi.list(appointmentId)
      .then((res) => {
        if (cancelled) return;
        const imgs = res.data.messages
          .filter((m: ChatMessageDto) =>
            !m.deletedAt &&
            m.attachmentUrl &&
            m.attachmentMime?.startsWith('image/'),
          )
          .map<ImageItem>((m) => ({
            url:       m.attachmentUrl!,
            name:      m.attachmentName ?? 'imagen',
            createdAt: m.createdAt,
          }));
        setItems(imgs);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Si la cita no es CHAT, el endpoint devuelve 400 — eso lo
        // tratamos como "sin galería", sin mostrar error.
        const code = (err as { response?: { status?: number } })?.response?.status;
        if (code === 400 || code === 403 || code === 404) {
          setItems([]);
        } else {
          setError('No se pudo cargar la galería del chat.');
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [appointmentId]);

  // Keyboard nav del lightbox
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      setActive(null);
      else if (e.key === 'ArrowRight') setActive((i) => (i! + 1) % items.length);
      else if (e.key === 'ArrowLeft')  setActive((i) => (i! - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, items.length]);

  if (loading) {
    return (
      <SectionCard>
        <div className="flex items-center gap-2 text-slate-400 py-2">
          <Loader2 className="animate-spin" size={14} />
          <span className="text-xs">Cargando galería…</span>
        </div>
      </SectionCard>
    );
  }

  if (error || items.length === 0) {
    return null; // No mostramos nada si no hay imágenes — silencioso por diseño
  }

  return (
    <>
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <ImageIcon size={16} className="text-blue-600" />
            Imágenes del chat
          </h3>
          <span className="text-xs text-slate-400">{items.length} {items.length === 1 ? 'imagen' : 'imágenes'}</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {items.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 transition group relative"
              title={img.name}
            >
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
            </button>
          ))}
        </div>
      </SectionCard>

      {active !== null && items[active] && (
        <Lightbox
          item={items[active]}
          index={active}
          total={items.length}
          onClose={() => setActive(null)}
          onPrev={() => setActive((i) => (i! - 1 + items.length) % items.length)}
          onNext={() => setActive((i) => (i! + 1) % items.length)}
        />
      )}
    </>
  );
}

/* ─── Lightbox a pantalla completa ─── */

function Lightbox({
  item, index, total, onClose, onPrev, onNext,
}: {
  item:    ImageItem;
  index:   number;
  total:   number;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 px-4 py-3 flex items-center justify-between text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="font-semibold truncate max-w-md">{item.name}</p>
          <p className="text-xs text-white/60">
            {index + 1} de {total} · {new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={item.url}
            download={item.name}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            title="Descargar"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          title="Anterior (←)"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image */}
      <img
        src={item.url}
        alt={item.name}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          title="Siguiente (→)"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
