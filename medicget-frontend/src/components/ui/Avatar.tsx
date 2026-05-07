/**
 * Avatar — initials-based avatar with configurable size, shape, and gradient variant.
 * Single source of truth for all user/doctor/patient avatars in the application.
 */

type AvatarSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape   = 'circle' | 'rounded';
type AvatarVariant = 'blue' | 'teal' | 'indigo' | 'purple' | 'emerald' | 'auto';

interface AvatarProps {
  initials: string;
  /**
   * Si se pasa, se renderiza la imagen como `<img>` (puede ser data URL o
   * https URL). Si la carga falla o el valor está vacío, fallback a las
   * iniciales sobre el gradiente — sin que el componente parpadee.
   */
  imageUrl?: string | null;
  size?:    AvatarSize;
  shape?:   AvatarShape;
  variant?: AvatarVariant;
  className?: string;
  /** Texto alternativo para accesibilidad cuando hay imagen. */
  alt?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6',  text: 'text-[10px]' },
  sm: { container: 'w-8 h-8',  text: 'text-xs'     },
  md: { container: 'w-10 h-10', text: 'text-sm'    },
  lg: { container: 'w-12 h-12', text: 'text-sm'    },
  xl: { container: 'w-20 h-20', text: 'text-2xl'   },
};

const SHAPE_CLASSES: Record<AvatarShape, string> = {
  circle:  'rounded-full',
  rounded: 'rounded-2xl',
};

const VARIANT_CLASSES: Record<AvatarVariant, string> = {
  blue:    'bg-gradient-to-br from-blue-500 to-indigo-600',
  teal:    'bg-gradient-to-br from-teal-500 to-emerald-600',
  indigo:  'bg-gradient-to-br from-indigo-500 to-purple-600',
  purple:  'bg-gradient-to-br from-purple-500 to-pink-600',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  // Picks a deterministic gradient from the initials character code
  auto:    '',
};

const AUTO_VARIANTS: Exclude<AvatarVariant, 'auto'>[] = ['blue', 'teal', 'indigo', 'purple', 'emerald'];

function resolveVariant(initials: string, variant: AvatarVariant): string {
  if (variant !== 'auto') return VARIANT_CLASSES[variant];
  const idx = (initials.charCodeAt(0) ?? 0) % AUTO_VARIANTS.length;
  return VARIANT_CLASSES[AUTO_VARIANTS[idx]];
}

export function Avatar({
  initials,
  imageUrl,
  size    = 'md',
  shape   = 'circle',
  variant = 'auto',
  className = '',
  alt,
}: AvatarProps) {
  const { container, text } = SIZE_CLASSES[size];
  const shapeClass   = SHAPE_CLASSES[shape];
  const gradientClass = resolveVariant(initials, variant);

  // Cuando hay imagen, renderizamos un wrapper que contiene el `<img>` y
  // las iniciales como fallback debajo. Si la imagen falla en cargar,
  // simplemente la ocultamos con un onError y queda visible la inicial
  // sin tener que mantener estado en React.
  if (imageUrl) {
    return (
      <div
        className={`
          relative overflow-hidden flex-shrink-0 flex items-center justify-center
          font-bold text-white
          ${container} ${shapeClass} ${gradientClass} ${className}
        `}
      >
        <span className={`absolute inset-0 flex items-center justify-center ${text}`}>
          {initials.slice(0, 2).toUpperCase()}
        </span>
        <img
          src={imageUrl}
          alt={alt ?? initials}
          className="relative w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        flex-shrink-0 flex items-center justify-center
        font-bold text-white
        ${container} ${shapeClass} ${gradientClass} ${className}
      `}
    >
      <span className={text}>{initials.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
