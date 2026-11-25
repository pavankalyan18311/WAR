import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProductInputError } from './products';

/** Service-role Supabase client — only use after requireAdmin(). */
export function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

export function productErrorResponse(err: unknown, action: string) {
  if (err instanceof ProductInputError) return NextResponse.json({ error: err.message }, { status: 400 });
  console.error(`Admin product ${action} failed:`, err);
  return NextResponse.json({ error: `Could not ${action} the product. Nothing was published — please try again.` }, { status: 500 });
}
