import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api from '@/lib/api';

type AuthFlowStage = 'mobile' | 'mobile_otp' | 'register' | 'email_otp' | 'authenticated';

interface PendingRegistration {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  password: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  flowStage: AuthFlowStage;
  /** true while SMS OTP has been sent and waiting for user entry */
  mobileOtpSent: boolean;
  emailOtpSent: boolean;
  /** @deprecated kept for API compat — no longer used */
  mobileWidgetOpen: boolean;
  /** populated by send/verify failure so components can show it */
  mobileWidgetError: string;
  currentMobile: string;
  pendingRegistration: PendingRegistration | null;
  passwordResetEmail: string;
  /**
   * Step 1: Sends a 6-digit SMS OTP to the mobile via MSG91 direct API.
   * Sets flowStage to 'mobile_otp' on success.
   */
  requestMobileOtp: (mobile: string) => Promise<void>;
  cancelMobileWidget: () => void;
  /**
   * Step 2: Verifies the SMS OTP the user typed.
   * Sets flowStage to 'register' on success.
   */
  verifyMobileOtp: (otp: string) => Promise<{ requiresRegistration: boolean }>;
  submitRegistration: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    dob: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  requestEmailOtp: () => Promise<void>;
  verifyEmailOtp: (otp: string) => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<void>;
  resetPasswordWithOtp: (payload: {
    email: string;
    otp: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ requiresConfirmation?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  resetFlow: () => void;
}

// ── Supabase email OTP helpers ────────────────────────────────────────────────
// These call Next.js Route Handlers which run server-side.
// Supabase keys are NEVER exposed to the browser.

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function callEmailOtp(body: Record<string, string>) {
  const res = await fetch('/api/auth/email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.error ?? 'Email OTP request failed.');
}

async function callPasswordReset(body: Record<string, string>) {
  const res = await fetch('/api/auth/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.error ?? 'Password reset request failed.');
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function extractApiError(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
  return e?.response?.data?.detail || e?.response?.data?.message || e?.message || fallback;
}

function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload?.exp === 'number') return payload.exp * 1000;
    return null;
  } catch {
    return null;
  }
}

function mapBackendUser(user: Partial<User>, fallback?: Partial<PendingRegistration>): User {
  const fullName = user.name || `${fallback?.firstName ?? ''} ${fallback?.lastName ?? ''}`.trim() || 'ThreadX User';
  const [firstName, ...rest] = fullName.split(' ');
  return {
    user_id: user.user_id || `user-${Date.now()}`,
    name: fullName,
    first_name: user.first_name || fallback?.firstName || firstName || '',
    last_name: user.last_name || fallback?.lastName || rest.join(' ') || '',
    email: user.email || fallback?.email || '',
    phone: user.phone,
    dob: user.dob || fallback?.dob,
    role: (user.role as User['role']) || 'customer',
    avatar: user.avatar,
    is_verified: user.is_verified ?? true,
    mobile_verified: user.mobile_verified ?? true,
    email_verified: user.email_verified ?? true,
    created_at: user.created_at,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      sessionToken: null,
      sessionExpiresAt: null,
      flowStage: 'register',
      mobileOtpSent: false,
      emailOtpSent: false,
      mobileWidgetOpen: false,
      mobileWidgetError: '',
      currentMobile: '',
      pendingRegistration: null,
      passwordResetEmail: '',

      // ── Step 1: Send SMS OTP via MSG91 direct API (backend proxy) ──────────
      requestMobileOtp: async (mobile) => {
        const cleaned = normalizePhone(mobile);
        if (cleaned.length !== 10) throw new Error('Please enter a valid 10-digit mobile number.');

        set({ mobileWidgetError: '', mobileOtpSent: false });
        try {
          const { data } = await api.post('/auth/send-mobile-otp', { mobile: cleaned });
          if (data?.message) {
            set({
              currentMobile: cleaned,
              mobileOtpSent: true,
              flowStage: 'mobile_otp',
              mobileWidgetError: '',
            });
          }
        } catch (err) {
          throw new Error(extractApiError(err, 'Failed to send OTP. Please try again.'));
        }
      },

      // Reset back to mobile input (user wants to change number or retry).
      cancelMobileWidget: () => {
        set({ mobileWidgetOpen: false, mobileWidgetError: '', mobileOtpSent: false, flowStage: 'register' });
      },

      // ── Step 2: Verify SMS OTP ───────────────────────────────────────────
      verifyMobileOtp: async (otp) => {
        const cleaned = normalizePhone(get().currentMobile);
        if (!cleaned) throw new Error('Mobile number missing. Please start over.');

        try {
          const { data } = await api.post('/auth/verify-mobile-otp', { mobile: cleaned, otp });

          if (data?.exists) {
            // Account already registered — tell UI to switch to Sign In
            throw new Error('Account already exists. Please sign in using Email & Password.');
          }

          set({
            flowStage: 'register',
            mobileWidgetOpen: false,
            mobileWidgetError: '',
            emailOtpSent: false,
            pendingRegistration: null,
          });
          return { requiresRegistration: true };
        } catch (err) {
          throw new Error(extractApiError(err, 'OTP verification failed. Please try again.'));
        }
      },

      // ── Registration form ──────────────────────────────────────────────────
      submitRegistration: async (payload) => {
        const cleanedEmail = normalizeEmail(payload.email);
        if (!payload.firstName.trim()) throw new Error('First name is required.');
        if (!payload.lastName.trim()) throw new Error('Last name is required.');
        if (!cleanedEmail) throw new Error('Email is required.');
        if (!payload.password || payload.password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (payload.password !== payload.confirmPassword) throw new Error('Password and confirm password do not match.');

        set({
          pendingRegistration: {
            firstName: payload.firstName.trim(),
            lastName: payload.lastName.trim(),
            email: cleanedEmail,
            dob: payload.dob,
            password: payload.password,
          },
          flowStage: 'email_otp',
        });
      },

      // ── Email OTP via Supabase ─────────────────────────────────────────────
      requestEmailOtp: async () => {
        const state = get();
        if (!state.pendingRegistration?.email) throw new Error('Please complete registration details first.');

        // Supabase sends a real 6-digit OTP to the user's email.
        // The Route Handler (server-side) uses NEXT_PUBLIC_SUPABASE_ANON_KEY.
        await callEmailOtp({ action: 'send', email: state.pendingRegistration.email });
        set({ emailOtpSent: true });
      },

      verifyEmailOtp: async (otp) => {
        const state = get();
        const reg = state.pendingRegistration;
        if (!reg) throw new Error('Email verification session missing.');

        // 1. Verify OTP with Supabase (server-side Route Handler).
        await callEmailOtp({ action: 'verify', email: reg.email, token: otp });

        // 2. Create user in FastAPI/PostgreSQL (bcrypt hashing happens on backend).
        const { data } = await api.post('/auth/register', {
          name: `${reg.firstName} ${reg.lastName}`.trim(),
          email: reg.email,
          phone: state.currentMobile,
          password: reg.password,
        });

        const accessToken = data?.access_token as string;
        const backendUser = mapBackendUser(data?.user, reg);
        const sessionExpiresAt = parseJwtExp(accessToken) ?? Date.now() + 24 * 60 * 60 * 1000;

        if (typeof window !== 'undefined') localStorage.setItem('access_token', accessToken);

        set({
          user: backendUser,
          isAuthenticated: true,
          sessionToken: accessToken,
          sessionExpiresAt,
          flowStage: 'authenticated',
          emailOtpSent: false,
          pendingRegistration: null,
        });
      },

      // ── Password reset via Supabase email OTP ─────────────────────────────
      requestPasswordResetOtp: async (email) => {
        const cleanedEmail = normalizeEmail(email);
        if (!cleanedEmail) throw new Error('Email is required.');

        await callPasswordReset({ action: 'send', email: cleanedEmail });
        set({ passwordResetEmail: cleanedEmail });
      },

      resetPasswordWithOtp: async ({ email, otp, password, confirmPassword }) => {
        const cleanedEmail = normalizeEmail(email);
        if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        // 1. Verify OTP via Supabase (server-side Route Handler).
        await callPasswordReset({ action: 'verify', email: cleanedEmail, token: otp });

        // 2. Update hashed password in FastAPI/PostgreSQL.
        await api.post('/auth/reset-password', { email: cleanedEmail, new_password: password });

        set({ passwordResetEmail: '' });
      },

      // ── Login (FastAPI — bcrypt verify + JWT) ─────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email: normalizeEmail(email), password });

          const accessToken = data?.access_token as string;
          const backendUser = mapBackendUser(data?.user);
          const sessionExpiresAt = parseJwtExp(accessToken) ?? Date.now() + 24 * 60 * 60 * 1000;

          if (typeof window !== 'undefined') localStorage.setItem('access_token', accessToken);

          set({
            user: backendUser,
            isAuthenticated: true,
            sessionToken: accessToken,
            sessionExpiresAt,
            flowStage: 'authenticated',
          });
        } catch (err) {
          throw new Error(extractApiError(err, 'Invalid email or password.'));
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Legacy single-call register (used by some pages) ──────────────────
      register: async (name, email, _phone, password) => {
        set({ isLoading: true });
        try {
          const [firstName = '', ...rest] = name.trim().split(' ');
          const lastName = rest.join(' ');
          await get().submitRegistration({ firstName, lastName, email, dob: '', password, confirmPassword: password });
          await get().requestEmailOtp();
          return {};
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* local logout must still proceed */ }
        if (typeof window !== 'undefined') localStorage.removeItem('access_token');
        set({
          user: null,
          isAuthenticated: false,
          sessionToken: null,
          sessionExpiresAt: null,
          flowStage: 'register',
          mobileOtpSent: false,
          emailOtpSent: false,
          mobileWidgetOpen: false,
          mobileWidgetError: '',
          passwordResetEmail: '',
          pendingRegistration: null,
        });
      },

      refreshUser: async () => {
        set((state) => {
          if (!state.sessionToken || !state.sessionExpiresAt || state.sessionExpiresAt < Date.now()) {
            if (typeof window !== 'undefined') localStorage.removeItem('access_token');
            return { user: null, isAuthenticated: false, sessionToken: null, sessionExpiresAt: null, flowStage: 'register' };
          }
          return { isAuthenticated: !!state.user };
        });
      },

      setUser: (user) => set((state) => ({
        user,
        isAuthenticated: !!user,
        flowStage: user ? 'authenticated' : 'register',
        sessionToken: state.sessionToken,
      })),

      resetFlow: () => set({
        flowStage: 'register',
        currentMobile: '',
        mobileOtpSent: false,
        emailOtpSent: false,
        mobileWidgetOpen: false,
        mobileWidgetError: '',
        pendingRegistration: null,
      }),    }),
    {
      name: 'threadx-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);
