import { apiOk } from '@medicget/shared/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return apiOk({ service: 'svc-auth', status: 'ok', timestamp: new Date().toISOString() });
}
