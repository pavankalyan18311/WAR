import type { User } from '@supabase/supabase-js';

export interface UserDisplayInfo {
  name: string;
  initial: string;
  email: string;
  phone: string | null;
  dob: string | null;
}

/** Profile fields live in Supabase `user_metadata` (written at sign-up / profile update). */
export function getUserDisplayInfo(user: Pick<User, 'email' | 'user_metadata'>): UserDisplayInfo {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? '';
  const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
  const name = fullName || meta.name || email.split('@')[0];

  return {
    name,
    initial: (name[0] ?? '').toUpperCase(),
    email,
    phone: meta.phone || null,
    dob: meta.dob || null,
  };
}
