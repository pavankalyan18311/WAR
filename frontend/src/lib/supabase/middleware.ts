import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

/**
 * Refreshes the Supabase session in middleware so Server Components always
 * receive a non-expired session. Must be called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
