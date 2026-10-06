'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

/**
 * Invisible component that runs once at app startup.
 * 1. Calls getSession() to verify/clear any stale refresh tokens.
 * 2. Subscribes to onAuthStateChange so Zustand stays in sync when
 *    Supabase internally fires SIGNED_OUT (e.g. after a 400 refresh failure).
 */
export default function AuthInitializer() {
  useEffect(() => {
    const supabase = createClient();

    // Verify session on mount — clears stale tokens if refresh fails
    useAuthStore.getState().getSession();

    // Keep Zustand state in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          session: null,
          isAuthenticated: false,
          role: 'customer',
          flowStage: 'register',
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          useAuthStore.setState({
            user: session.user,
            session,
            isAuthenticated: true,
            flowStage: 'authenticated',
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
