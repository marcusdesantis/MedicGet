import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      service: 'svc-dashboard',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
}
