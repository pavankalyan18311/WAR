import { NextResponse } from 'next/server';
import { checkPincodeServiceability } from '@/lib/shiprocket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/shipping/serviceability
 * Body: { pincode: string, cod?: boolean, weight?: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pincode, cod = false, weight = 0.5 } = body;

    if (!pincode) {
      return NextResponse.json({ success: false, serviceable: false, error: 'Pincode is required' }, { status: 400 });
    }

    const result = await checkPincodeServiceability(String(pincode), Boolean(cod), Number(weight));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('/api/shipping/serviceability error:', err);
    return NextResponse.json({ success: false, serviceable: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
