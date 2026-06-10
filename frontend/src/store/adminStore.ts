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

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
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
          if (!p || !['admin', 'super_admin'].includes(p.role)) {
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
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ admin: null, isAuthenticated: false });
      },
    }),
    {
      name: 'threadx-admin',
      partialize: (state) => ({ admin: state.admin, isAuthenticated: state.isAuthenticated }),
    }
  )
);
