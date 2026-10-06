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

const ADMIN_ROLES = ['admin', 'super_admin', 'manager'] as const;

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
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (error || !data.user) {
            set({ isLoading: false });
            return false;
          }

          const { data: profile, error: profileError } = await (supabase as any)
            .from('profiles')
            .select('role, name')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            set({ isLoading: false });
            return false;
          }

          const role = ((profile as any).role || '').toLowerCase();

          if (!ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
            await supabase.auth.signOut();
            set({ isLoading: false });
            return false;
          }

          set({
            admin: {
              id: data.user.id,
              name: (profile as any).name || data.user.email?.split('@')[0] || 'Admin',
              email: data.user.email ?? email,
              role: role as AdminUser['role'],
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err) {
          console.error('Admin login error:', err);
          set({ isLoading: false });
          return false;
        }
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
