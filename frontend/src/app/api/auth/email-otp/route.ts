import { NextResponse } from 'next/server';

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * POST /api/auth/email-otp
 * Proxies to backend Resend-based email OTP endpoints.
 *
 * body { action: 'send', email: string }
 * body { action: 'verify', email: string, token: string }
 */
export async function POST(request: Request) {
  let body: { action?: string; email?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { action, email, token } = body;

  if (!email) return NextResponse.json({ error: 'email is required.' }, { status: 400 });

  const backendBase = process.env.BACKEND_ORIGIN ?? 'http://localhost:8000';

  if (action === 'send') {
    const res = await fetch(`${backendBase}/api/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) return NextResponse.json({ error: data?.detail ?? 'Failed to send OTP.' }, { status: res.status });
    return NextResponse.json({ success: true, message: data.message });
  }

  if (action === 'verify') {
    if (!token) return NextResponse.json({ error: 'token is required.' }, { status: 400 });
    const res = await fetch(`${backendBase}/api/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: token }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) return NextResponse.json({ error: data?.detail ?? 'OTP verification failed.' }, { status: res.status });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
