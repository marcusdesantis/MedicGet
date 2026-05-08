/**
 * TrendLineChart — gráfico de línea inline en SVG (sin librerías externas).
 *
 *   <TrendLineChart
 *     data={[
 *       { label: 'Ene', value: 12 },
 *       { label: 'Feb', value: 18 },
 *       ...
 *     ]}
 *     height={180}
 *     color="#10b981"
 *     formatValue={(n) => `$${n.toFixed(0)}`}
 *   />
 *
 * Diseño:
 * - Línea + área degradada por debajo (tipo dashboard "real").
 * - Puntos con tooltip al hover.
 * - Etiquetas del eje X cada N valores para no saturar.
 * - Si todos los valores son 0, muestra una placeholder line plana.
 */

import { useId, useMemo, useState } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

interface Props {
  data:        TrendPoint[];
  height?:     number;
  /** Color principal — hex o cualquier color válido CSS. Default azul. */
  color?:      string;
  formatValue?: (value: number) => string;
  /** Mostrar el valor encima del último punto. */
  showLastLabel?: boolean;
}

const PADDING = { top: 16, right: 12, bottom: 24, left: 36 };

export function TrendLineChart({
  data,
  height = 180,
  color = '#3b82f6',
  formatValue = (n) => String(n),
  showLastLabel = true,
}: Props) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { width, points, areaPath, linePath, yLabels, max } = useMemo(() => {
    const w = 600; // viewBox width — se escala vía CSS
    const innerW = w - PADDING.left - PADDING.right;
    const innerH = height - PADDING.top - PADDING.bottom;

    const values = data.map((d) => d.value);
    const maxRaw = Math.max(...values, 1);
    // Round up to a "nice" number for the y-axis ceiling.
    const niceMax = niceCeiling(maxRaw);

    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const pts = data.map((d, i) => ({
      x: PADDING.left + i * stepX,
      y: PADDING.top + innerH - (d.value / niceMax) * innerH,
      ...d,
    }));

    const line = pts.length > 0
      ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';
    const area = pts.length > 0
      ? `${line} L ${pts[pts.length - 1]!.x} ${PADDING.top + innerH} L ${pts[0]!.x} ${PADDING.top + innerH} Z`
      : '';

    const labels = [niceMax, niceMax * 0.5, 0].map((v) => ({
      value: v,
      y: PADDING.top + innerH - (v / niceMax) * innerH,
    }));

    return { width: w, points: pts, linePath: line, areaPath: area, yLabels: labels, max: niceMax };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        Sin datos suficientes
      </div>
    );
  }

  const last = points[points.length - 1];
  const innerH = height - PADDING.top - PADDING.bottom;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y axis grid lines + labels */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={l.y}
              y2={l.y}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeDasharray="2 4"
            />
            <text
              x={PADDING.left - 6}
              y={l.y + 3}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="9"
            >
              {formatValue(l.value)}
            </text>
          </g>
        ))}

        {/* Area + line */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + invisible hover targets */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={hover === i ? 4.5 : 3} fill="white" stroke={color} strokeWidth="2" />
            <rect
              x={p.x - 14}
              y={PADDING.top}
              width={28}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* X axis labels — cada N para no saturar */}
        {points.map((p, i) => {
          const skip = Math.max(1, Math.floor(points.length / 6));
          if (i % skip !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="10"
            >
              {p.label}
            </text>
          );
        })}

        {/* Tooltip del punto en hover */}
        {hover !== null && points[hover] && (
          <g>
            <rect
              x={Math.min(Math.max(points[hover]!.x - 38, 0), width - 76)}
              y={Math.max(points[hover]!.y - 36, 0)}
              width="76"
              height="28"
              rx="6"
              fill="#0f172a"
              opacity="0.92"
            />
            <text
              x={Math.min(Math.max(points[hover]!.x, 38), width - 38)}
              y={Math.max(points[hover]!.y - 19, 13)}
              textAnchor="middle"
              fill="white"
              fontSize="10"
            >
              {points[hover]!.label}
            </text>
            <text
              x={Math.min(Math.max(points[hover]!.x, 38), width - 38)}
              y={Math.max(points[hover]!.y - 7, 25)}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="bold"
            >
              {formatValue(points[hover]!.value)}
            </text>
          </g>
        )}

        {/* Etiqueta fija sobre el último punto */}
        {showLastLabel && hover === null && last && (
          <text
            x={Math.min(last.x, width - 30)}
            y={Math.max(last.y - 8, 12)}
            textAnchor="end"
            fill={color}
            fontSize="10"
            fontWeight="bold"
          >
            {formatValue(last.value)}
          </text>
        )}
      </svg>
      {/* Para que TS no se queje del max no usado en JSX */}
      <span className="hidden">{max}</span>
    </div>
  );
}

/**
 * Devuelve un techo "redondo" que sea >= valor para que el eje Y se vea
 * limpio. Ej: 47 → 50, 132 → 150, 1.7 → 2.
 */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const ratio = value / base;
  if (ratio <= 1)   return 1   * base;
  if (ratio <= 2)   return 2   * base;
  if (ratio <= 2.5) return 2.5 * base;
  if (ratio <= 5)   return 5   * base;
  return 10 * base;
}
