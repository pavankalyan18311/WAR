import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager';
  avatar?: string;
}

interface AdminStore {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// ── Fallback mock credentials for local dev ──────────────────────────
const MOCK_ADMINS: Record<string, { password: string; user: AdminUser }> = {
  'admin@war.in': {
    password: 'admin123',
    user: { id: 'mock-1', name: 'WAR Admin', email: 'admin@war.in', role: 'super_admin' },
  },
  'admin@threadx.in': {
    password: 'admin123',
    user: { id: 'mock-1', name: 'WAR Admin', email: 'admin@threadx.in', role: 'super_admin' },
  },
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });

        // 1. First attempt real Supabase Authentication
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

          if (!error && data.user) {
            const userEmail = (data.user.email || email).toLowerCase().trim();
            const userMeta = data.user.user_metadata || {};
            const appMeta = data.user.app_metadata || {};

            // Fetch profile role from public.profiles table if exists
            let profileRole = '';
            let profileName = '';
            try {
              const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
              if (profile) {
                profileRole = profile.role || '';
                profileName = profile.name || '';
              }
            } catch (pErr) {
              // Ignore if profiles table does not have role column
            }

            const role = (profileRole || appMeta.role || userMeta.role || (userEmail === 'maladoddipavankalyan@gmail.com' ? 'super_admin' : 'admin')).toLowerCase();
            const name = profileName || userMeta.first_name ? `${userMeta.first_name} ${userMeta.last_name || ''}`.trim() : 'Pavan Kalyan';

            // Allow if email is maladoddipavankalyan@gmail.com OR role is admin/super_admin/manager
            if (userEmail === 'maladoddipavankalyan@gmail.com' || ['admin', 'super_admin', 'manager'].includes(role)) {
              set({
                admin: {
                  id: data.user.id,
                  name: name,
                  email: data.user.email ?? email,
                  role: (userEmail === 'maladoddipavankalyan@gmail.com' ? 'super_admin' : role) as AdminUser['role'],
                },
                isAuthenticated: true,
                isLoading: false,
              });
              return true;
            }
          }
        } catch (err) {
          console.warn('Supabase auth attempt error:', err);
        }

        // 2. Fallback check mock admin credentials for development
        const mock = MOCK_ADMINS[email.toLowerCase().trim()];
        if (mock && mock.password === password) {
          set({ admin: mock.user, isAuthenticated: true, isLoading: false });
          return true;
        }

        set({ isLoading: false });
        return false;
      },

      logout: async () => {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch (err) {
          // ignore
        }
        set({ admin: null, isAuthenticated: false });
      },
    }),
    {
      name: 'war-admin',
      partialize: (state) => ({ admin: state.admin, isAuthenticated: state.isAuthenticated }),
    }
  )
);
