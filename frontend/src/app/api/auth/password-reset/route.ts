import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

function isConfigured() {
  return (
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('your-') &&
    SUPABASE_ANON_KEY.length > 20
  );
}

/**
 * POST /api/auth/password-reset
 *
 * body { action: 'send', email: string }
 *   → Sends a 6-digit OTP to `email` so the user can prove identity.
 *
 * body { action: 'verify', email: string, token: string }
 *   → Verifies the OTP. Returns { success: true } on match.
 *     After this, the client should call FastAPI /auth/reset-password
 *     with { email, new_password } to persist the new hashed password.
 *
 * Runs server-side only — Supabase keys never exposed to browser.
 */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Email service is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.' },
      { status: 503 },
    );
  }

  let body: { action?: string; email?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { action, email, token } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required.' }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── SEND ─────────────────────────────────────────────────────────────────
  if (action === 'send') {
    // shouldCreateUser: false → only send OTP if a Supabase auth record exists.
    // shouldCreateUser: true  → send even if first time (safe for our flow).
    // We use true because our primary user store is FastAPI, not Supabase.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password reset OTP sent to email.' });
  }

  // ── VERIFY ───────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required.' }, { status: 400 });
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Verification passed. The caller (authStore) will now call FastAPI to
    // persist the new hashed password in PostgreSQL.
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'action must be "send" or "verify".' }, { status: 400 });
}
