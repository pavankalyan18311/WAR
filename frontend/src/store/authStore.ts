import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

function profileToUser(p: Profile): User {
  return {
    user_id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone ?? undefined,
    role: p.role as User['role'],
    avatar: p.avatar_url ?? undefined,
    is_verified: p.is_verified,
    created_at: p.created_at,
  };
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ requiresConfirmation?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw new Error(error.message);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) throw new Error('Could not load profile');
          set({ user: profileToUser(profile), isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name, email, phone, password) => {
        set({ isLoading: true });
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, phone } },
          });
          if (error) throw new Error(error.message);

          if (data.session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user!.id)
              .single();
            if (profile) set({ user: profileToUser(profile), isAuthenticated: true });
            return {};
          }
          return { requiresConfirmation: true };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { set({ user: null, isAuthenticated: false }); return; }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) set({ user: profileToUser(profile), isAuthenticated: true });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    { name: 'threadx-auth', partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);
