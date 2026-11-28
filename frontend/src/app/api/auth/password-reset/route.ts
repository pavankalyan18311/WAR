import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

const WRONG_CODE = 'That code is wrong or has expired. Please request a new one.';

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
 *   → Sends a password reset code if the email has an account. Always answers the same way,
 *     so the form can't be used to discover which emails are customers.
 *
 * body { action: 'verify', email: string, token: string, password: string }
 *   → Verifies OTP and updates user password in Supabase Auth.
 */
export async function POST(request: Request) {
  let body: { action?: string; email?: string; token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Limit per visitor AND per email, so nobody can flood an inbox or guess codes from many IPs.
  const target = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const isVerify = body.action === 'verify';
  const rule = isVerify ? RATE.verify : RATE.email;
  const bucket = isVerify ? 'reset-verify' : 'reset-send';
  const limited = rateLimit(request, bucket, rule) ?? (target ? rateLimit(request, `${bucket}-email`, rule, target) : null);
  if (limited) return limited;

  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Email service is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.' },
      { status: 503 },
    );
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
    // Same answer whether or not the email has an account, so the form can't be used to find customers.
    const sent = NextResponse.json({ success: true, message: 'If an account exists for this email, a reset code is on its way.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (!profile) return sent;

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (resetErr) {
      // Fallback: signInWithOtp without creating a user
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });
      if (otpErr) console.error('password-reset send failed:', otpErr.message);
    }
    return sent;
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
      return NextResponse.json({ error: WRONG_CODE }, { status: 400 });
    }

    // 2. Update password via admin API using the user ID from the verified OTP
    const userId = verifyData?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Could not identify user from OTP. Please request a new code.' }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });

    if (updateError) {
      console.error('password-reset update failed:', updateError.message);
      const weak = /password/i.test(updateError.message);
      return NextResponse.json(
        { error: weak ? 'Please choose a stronger password (at least 8 characters, not a common one).' : 'Could not reset your password. Please try again.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  }

  return NextResponse.json({ error: 'Action must be "send" or "verify".' }, { status: 400 });
}
