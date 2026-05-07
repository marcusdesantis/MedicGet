import { NextRequest } from 'next/server';
import { apiOk } from '@medicget/shared/response';
import { getSetting } from '@medicget/shared/settings';

export const dynamic = 'force-dynamic';

/**
 * Public read of the few settings the anonymous landing page needs:
 * brand name, logo URL. We deliberately don't expose secrets here.
 */
export async function GET(_req: NextRequest) {
  const [brandName, brandLogo] = await Promise.all([
    getSetting('BRAND_NAME', 'MedicGet'),
    getSetting('BRAND_LOGO_URL'),
  ]);
  return apiOk({
    brandName: brandName ?? 'MedicGet',
    brandLogo: brandLogo ?? null,
  });
}
