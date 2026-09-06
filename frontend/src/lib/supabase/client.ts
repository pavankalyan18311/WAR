import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser/client-side Supabase client.
 * Use in Client Components ('use client') and Zustand stores.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isDummyUrl = !supabaseUrl || supabaseUrl.includes('qjwmqzjgypoklsorqblg') || supabaseUrl.includes('example.supabase.co');

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: !isDummyUrl,
        persistSession: true,
        detectSessionInUrl: !isDummyUrl,
      },
    }
  );
}
