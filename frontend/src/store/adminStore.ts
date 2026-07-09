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

// ── Mock credentials (used when Supabase is not yet configured) ──────────────
const MOCK_ADMINS: Record<string, { password: string; user: AdminUser }> = {
  'admin@threadx.in': {
    password: 'admin123',
    user: { id: 'mock-1', name: 'Admin', email: 'admin@threadx.in', role: 'super_admin' },
  },
  'manager@threadx.in': {
    password: 'manager123',
    user: { id: 'mock-2', name: 'Manager', email: 'manager@threadx.in', role: 'manager' },
  },
};

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.startsWith('https://') && !url.startsWith('your-');
};

// Keep original behavior: detect whether Supabase is configured.

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });

        // ── Fallback: mock auth when Supabase is not configured ──────────────
        if (!isSupabaseConfigured()) {
          const mock = MOCK_ADMINS[email.toLowerCase()];
          if (mock && mock.password === password) {
            set({ admin: mock.user, isAuthenticated: true, isLoading: false });
            return true;
          }
          set({ isLoading: false });
          return false;
        }

        // ── Real Supabase auth ───────────────────────────────────────────────
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.user) { set({ isLoading: false }); return false; }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const p = profile as { id: string; name: string; email: string; role: string; avatar_url: string | null } | null;
          if (!p || !['admin', 'super_admin', 'manager'].includes(p.role)) {
            await supabase.auth.signOut();
            set({ isLoading: false });
            return false;
          }

          set({
            admin: {
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role as AdminUser['role'],
              avatar: p.avatar_url ?? undefined,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          await supabase.auth.signOut();
        }
        set({ admin: null, isAuthenticated: false });
      },
    }),
    {
      name: 'threadx-admin',
      partialize: (state) => ({ admin: state.admin, isAuthenticated: state.isAuthenticated }),
    }
  )
);
