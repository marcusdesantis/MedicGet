/**
 * AvatarUploader — clic para subir foto de perfil.
 *
 *  ┌─────────────┐
 *  │  ┌───────┐  │
 *  │  │ Photo │  │  ← clic abre file picker
 *  │  └───────┘  │     hover muestra "Cambiar foto"
 *  │  📷 Cambiar │
 *  └─────────────┘
 *
 * Pipeline al subir:
 *   1. Lee el archivo con FileReader
 *   2. Carga la imagen en un <img> escondido
 *   3. La pinta en un canvas redimensionada a MAX_SIZE (centrada y
 *      recortada en cuadrado)
 *   4. Exporta canvas → JPEG dataURL @ 80% de calidad
 *   5. Invoca `onChange(dataURL)` con la string final
 *
 * El resultado típico pesa 30–60 KB — cabe en la columna `avatarUrl`
 * (TEXT) sin problema. No hay subida real al servidor: el dataURL viaja
 * como cualquier campo más en `usersApi.updateProfile()`.
 *
 * Si en el futuro querés migrar a S3 / Cloudinary, sólo cambiás el
 * `onChange` para que primero suba al storage y devuelva la URL https.
 */
import { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar }  from './Avatar';

const MAX_SIZE = 400;            // px — output cuadrado
const QUALITY  = 0.8;            // jpeg quality
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB de input

interface AvatarUploaderProps {
  /** URL/dataURL actual de la foto (lo que mostrar). */
  value:    string | null | undefined;
  /** Iniciales fallback cuando no hay foto. */
  initials: string;
  /** Llamado con el nuevo dataURL al subir, o `null` al quitar. */
  onChange: (next: string | null) => void;
  /** Tamaño visual del avatar. */
  size?:    'lg' | 'xl';
  /** Color del gradiente de las iniciales. */
  variant?: 'blue' | 'teal' | 'indigo' | 'purple' | 'emerald' | 'auto';
  /** Forma del avatar (circle por default). */
  shape?:   'circle' | 'rounded';
}

export function AvatarUploader({
  value, initials, onChange,
  size = 'xl', variant = 'auto', shape = 'circle',
}: AvatarUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy,  setBusy]  = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Tiene que ser una imagen (JPG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('La imagen es muy grande. Máximo 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await resizeImage(file);
      onChange(dataUrl);
    } catch (err) {
      toast.error('No se pudo procesar la imagen.');
      // eslint-disable-next-line no-console
      console.error('[AvatarUploader] resize failed:', err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onPick = () => fileRef.current?.click();
  const onClear = () => onChange(null);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative group">
        <Avatar
          initials={initials}
          imageUrl={value ?? undefined}
          size={size}
          variant={variant}
          shape={shape}
        />
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="absolute inset-0 rounded-full flex items-center justify-center bg-slate-900/0 hover:bg-slate-900/50 transition opacity-0 hover:opacity-100 disabled:opacity-100 disabled:bg-slate-900/50"
          title="Cambiar foto"
        >
          {busy ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
        >
          {value ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {value && (
          <>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
            >
              <Trash2 size={11} /> Quitar
            </button>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}

/* ─── Helper: redimensiona y comprime una imagen a JPEG dataURL ───── */
async function resizeImage(file: File): Promise<string> {
  // 1. Leer como dataURL para crear la `<img>`
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // 2. Cargar la imagen
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload  = () => resolve(i);
    i.onerror = () => reject(new Error('Image load failed'));
    i.src = dataUrl;
  });

  // 3. Crop cuadrado centrado
  const sourceSize = Math.min(img.width, img.height);
  const sx = (img.width  - sourceSize) / 2;
  const sy = (img.height - sourceSize) / 2;

  // 4. Pintar en canvas a MAX_SIZE
  const canvas = document.createElement('canvas');
  canvas.width  = MAX_SIZE;
  canvas.height = MAX_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');
  ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, MAX_SIZE, MAX_SIZE);

  // 5. Exportar como JPEG (mejor compresión que PNG para fotos)
  return canvas.toDataURL('image/jpeg', QUALITY);
}
