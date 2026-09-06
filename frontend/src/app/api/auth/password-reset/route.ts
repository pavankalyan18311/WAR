import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

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
 *   → Checks if email is registered in public.profiles/auth. If not registered, returns 404 error.
 *     If registered, sends password reset OTP.
 *
 * body { action: 'verify', email: string, token: string, password: string }
 *   → Verifies OTP and updates user password in Supabase Auth.
 */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Email service is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.' },
      { status: 503 },
    );
  }

  let body: { action?: string; email?: string; token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { action, email, token, password } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── SEND OTP FOR FORGOT PASSWORD ──────────────────────────────────────────
  if (action === 'send') {
    // 1. Check if user profile exists in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: `No registered account found with email "${cleanEmail}". Please check your email or create a new account.` },
        { status: 404 },
      );
    }

    // 2. User exists -> Send Password Reset OTP
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (resetErr) {
      // Fallback: signInWithOtp without creating a user
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        return NextResponse.json({ error: otpErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'Password reset OTP sent to registered email.' });
  }

  // ── VERIFY OTP & UPDATE PASSWORD ──────────────────────────────────────────
  if (action === 'verify') {
    if (!token || typeof token !== 'string' || token.trim().length < 6) {
      return NextResponse.json({ error: 'Valid 6-digit OTP token is required.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const cleanToken = token.trim();

    // 1. Attempt recovery OTP verification
    let { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'recovery',
    });

    if (verifyError) {
      // Fallback to type 'email'
      const fallback = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (!fallback.error) {
        verifyData = fallback.data;
        verifyError = null;
      }
    }

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { error: verifyError?.message || 'Invalid or expired OTP token. Please request a new one.' },
        { status: 400 }
      );
    }

    // 2. Update password for verified user
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  }

  return NextResponse.json({ error: 'Action must be "send" or "verify".' }, { status: 400 });
}
