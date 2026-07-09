import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

/**
 * Refreshes the Supabase session in middleware so Server Components always
 * receive a non-expired session. Must be called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase env vars are not configured, skip auth and just set pathname header
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow a developer override to disable Supabase auth checks in middleware.
  // This is intentionally separate from the client-only `NEXT_PUBLIC_DISABLE_SUPABASE_AUTH` —
  // if set at the server/container level, middleware will skip auth and allow admin routes.
  const serverBypass = (process.env.DISABLE_SUPABASE_AUTH ?? process.env.NEXT_PUBLIC_DISABLE_SUPABASE_AUTH ?? '').toString() === 'true';

  if (serverBypass || !supabaseUrl || supabaseUrl.startsWith('your-') || !supabaseAnonKey || supabaseAnonKey.startsWith('your-')) {
    supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname);
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this call
  const { data: { user } } = await supabase.auth.getUser();

  // Pass pathname to layout for admin route detection
  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname);

  // Protect admin routes — redirect to admin login if not authenticated as admin
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !user
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
