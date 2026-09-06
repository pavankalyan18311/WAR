const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = {};
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const idx = raw.indexOf('=');
    if (idx > 0) {
      const key = raw.slice(0, idx).trim();
      const value = raw.slice(idx + 1).trim();
      env[key] = value;
    }
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `copilot.e2e.${Date.now()}@example.com`;
  const password = 'SupabaseTest123!';

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: 'Copilot E2E' } },
  });

  console.log(JSON.stringify({
    step: 'signup',
    email,
    signUpError: signUpError?.message ?? null,
    userId: signUpData?.user?.id ?? null,
    sessionExists: !!signUpData?.session,
  }, null, 2));

  if (signUpData?.session && signUpData?.user?.id) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .maybeSingle();
    console.log(JSON.stringify({
      step: 'profile',
      profileError: profileError?.message ?? null,
      profile: profileData,
    }, null, 2));
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  console.log(JSON.stringify({
    step: 'signin',
    signInError: signInError?.message ?? null,
    sessionExists: !!signInData?.session,
  }, null, 2));

  const otpResponse = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  console.log(JSON.stringify({
    step: 'otp',
    otpError: otpResponse.error?.message ?? null,
  }, null, 2));

  const routeRes = await fetch('http://127.0.0.1:3000/api/auth/email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', email }),
  });
  const routeBody = await routeRes.text();
  console.log(JSON.stringify({
    step: 'email-route',
    status: routeRes.status,
    body: routeBody,
  }, null, 2));

  const resetRouteRes = await fetch('http://127.0.0.1:3000/api/auth/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', email }),
  });
  const resetRouteBody = await resetRouteRes.text();
  console.log(JSON.stringify({
    step: 'password-reset-route',
    status: resetRouteRes.status,
    body: resetRouteBody,
  }, null, 2));
})();
