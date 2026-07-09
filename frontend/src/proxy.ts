import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js expects this file to export a function named `proxy` (or a default
// function). Previously this was `middleware` — rename the export accordingly.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * Required for Supabase session cookie refresh on every request.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
