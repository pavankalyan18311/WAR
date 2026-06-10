import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser/client-side Supabase client.
 * Use in Client Components ('use client') and Zustand stores.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
