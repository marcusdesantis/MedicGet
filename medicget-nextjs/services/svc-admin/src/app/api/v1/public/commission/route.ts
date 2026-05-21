import { apiOk } from '@medicget/shared/response';
import { prisma } from '@medicget/shared/prisma';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint - devuelve el % de comisión INFORMATIVO que la
 * plataforma publica en la landing y en /terminos para transparencia
 * con los usuarios.
 *
 * NO requiere auth porque cualquier visitante anónimo debe poder leerlo
 * para entender el modelo de negocio antes de registrarse.
 *
 * El valor se persiste en AppSettings con clave `COMMISSION_PCT`. Si la
 * fila no existe o está vacía, devolvemos el default (`15`) para que la
 * landing siempre tenga algo que mostrar.
 */
export async function GET() {
  const setting = await prisma.appSettings.findUnique({
    where: { key: 'COMMISSION_PCT' },
  });

  // Default si nadie lo configuró todavía.
  const raw = setting?.value ?? '15';
  const value = Number.parseFloat(raw);
  const pct = Number.isFinite(value) ? value : 15;

  return apiOk({
    /** Porcentaje de comisión sobre el monto de la consulta. */
    commissionPct: pct,
    /**
     * Texto humano corto para usar en banners ("comisión del 15%
     * por consulta"). El frontend puede ignorarlo y formatear el
     * número como prefiera.
     */
    label: `${pct.toFixed(0)}% por consulta`,
  });
}
