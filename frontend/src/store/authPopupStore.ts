import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  updateConfig: (patch: Partial<AuthPopupConfig>) => void;
  resetDefaults: () => void;
}

const DEFAULT_CONFIG: AuthPopupConfig = {
  enabled: true,
  delayMs: 10000,
  mediaType: 'image',
  mediaUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80',
  headline: 'Unlock Your Private Style Edit',
  description: 'Join the ThreadX circle for early access drops, members-only rewards, and a personalized fit journey.',
  ctaText: 'Continue With Email Verification',
  sessionBehavior: 'once-per-session',
};

export const useAuthPopupStore = create<AuthPopupStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
      resetDefaults: () => set({ config: DEFAULT_CONFIG }),
    }),
    {
      name: 'threadx-auth-popup-config',
      partialize: (state) => ({ config: state.config }),
    }
  )
);
