import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Refreshes the Supabase session cookie and protects /admin pages (admin role required). */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files and images so auth never blocks CSS/JS/media.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)'],
};
