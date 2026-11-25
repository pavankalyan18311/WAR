import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'manager'];

type AuthResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse };

const deny = (status: 401 | 403, error: string): AuthResult => ({
  user: null,
  response: NextResponse.json({ error }, { status }),
});

/** Resolves the signed-in user from the Supabase auth cookies, or a 401 response. */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return deny(401, 'Please sign in to continue.');
  return { user: data.user, response: null };
}

/** Like requireUser, but also requires an admin role in public.profiles (403 otherwise). */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.user) return result;

  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', result.user.id)
    .maybeSingle();

  if (!profile || !ADMIN_ROLES.includes(String(profile.role).toLowerCase())) {
    return deny(403, 'Admin access required.');
  }
  return result;
}
