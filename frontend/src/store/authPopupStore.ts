import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type AuthPopupMediaType = 'image' | 'video';
export type AuthPopupSessionBehavior = 'once-per-session' | 'always';

export interface AuthPopupConfig {
  enabled: boolean;
  delayMs: number;
  mediaType: AuthPopupMediaType;
  mediaUrl: string;
  headline: string;
  description: string;
  ctaText: string;
  sessionBehavior: AuthPopupSessionBehavior;
}

interface AuthPopupStore {
  config: AuthPopupConfig;
  /** Loads the popup settings the admin saved (shared by all shoppers). */
  loadConfig: () => Promise<void>;
  /** Edits the local draft (admin settings page). */
  updateConfig: (patch: Partial<AuthPopupConfig>) => void;
  /** Saves the draft for everyone via the admin API. */
  saveConfig: () => Promise<void>;
  resetDefaults: () => void;
}

export const DEFAULT_POPUP_CONFIG: AuthPopupConfig = {
  enabled: true,
  delayMs: 10000,
  mediaType: 'image',
  mediaUrl: '',
  headline: 'Join WAR — Without Any Regrets',
  description: 'Create your account to get early access to new drops and members-only offers.',
  ctaText: 'Continue With Email Verification',
  sessionBehavior: 'once-per-session',
};

export const useAuthPopupStore = create<AuthPopupStore>()((set, get) => ({
  config: DEFAULT_POPUP_CONFIG,

  loadConfig: async () => {
    const { data, error } = await createClient()
      .from('store_settings')
      .select('auth_popup')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.warn('Could not load popup settings:', error.message);
      return;
    }
    const saved = (data?.auth_popup ?? {}) as Partial<AuthPopupConfig>;
    set({ config: { ...DEFAULT_POPUP_CONFIG, ...saved } });
  },

  updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),

  saveConfig: async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_popup: get().config }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not save settings.');
  },

  resetDefaults: () => set({ config: DEFAULT_POPUP_CONFIG }),
}));
