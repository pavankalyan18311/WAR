import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cartStore";

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string;
  flowStage: "register" | "email_otp" | "authenticated";
  pendingRegistration: RegisterData | null;

  signUp: (data: any) => Promise<void>;
  submitRegistration: (data: any) => Promise<void>;
  requestEmailOtp: () => Promise<void>;
  verifyOtp: (data: { email: string; otp: string }) => Promise<void>;
  verifyEmailOtp: (otp: string) => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<void>;
  resetPasswordWithOtp: (data: {
    email: string;
    otp: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<{ role: string }>;
  logout: () => Promise<void>;
  getSession: () => Promise<void>;
  updateProfile: (data: { firstName: string; lastName: string; phone?: string; dob?: string }) => Promise<void>;
  resetFlow: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: false,
      isAuthenticated: false,
      role: "customer",
      flowStage: "register",
      pendingRegistration: null,

      // ===============================
      // Registration
      // ===============================

      submitRegistration: async (data) => {
        const supabase = createClient();
        set({
          loading: true,
          pendingRegistration: data,
        });

        if (!data.firstName.trim()) throw new Error("First name is required.");
        if (!data.lastName.trim()) throw new Error("Last name is required.");
        if (!data.email.trim()) throw new Error("Email is required.");
        if (data.password.length < 8) throw new Error("Password must be at least 8 characters.");
        if (data.password !== data.confirmPassword) throw new Error("Passwords do not match.");

        const email = data.email.trim().toLowerCase();

        const { error } = await supabase.auth.signUp({
          email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              phone: data.phone ?? "",
              dob: data.dob,
              role: "customer",
            },
          },
        });

        if (error) {
          set({ loading: false });
          throw error;
        }

        set({
          loading: false,
          flowStage: "email_otp",
        });
      },

      signUp: async (data) => {
        await get().submitRegistration(data);
      },

      // ===============================
      // Email OTP Verification
      // ===============================

      requestEmailOtp: async () => {
        const email = get().pendingRegistration?.email;
        if (!email) throw new Error("No pending registration found.");
        const supabase = createClient();
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
        });
        if (error) throw error;
        set({ flowStage: "email_otp" });
      },

      verifyEmailOtp: async (otp) => {
        const state = get();
        const email = state.pendingRegistration?.email;
        if (!email) {
          throw new Error("Email verification session expired. Please register again.");
        }

        await get().verifyOtp({ email, otp });
      },

      verifyOtp: async ({ email, otp }) => {
        const supabase = createClient();
        set({ loading: true });

        let { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp.trim(),
          type: "signup",
        });

        if (error) {
          const fallback = await supabase.auth.verifyOtp({
            email,
            token: otp.trim(),
            type: "email",
          });
          if (!fallback.error) {
            data = fallback.data;
            error = null;
          }
        }

        if (error || !data.session) {
          set({ loading: false });
          throw error || new Error("Invalid or expired OTP. Please try again.");
        }

        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          flowStage: "authenticated",
          pendingRegistration: null,
          loading: false,
        });

        // Initialize user cart persistence in DB
        useCartStore.getState().initializeUserCart(data.user.id);
      },

      // ===============================
      // Password Reset / Recovery
      // ===============================

      requestPasswordResetOtp: async (email: string) => {
        const cleanEmail = (email || "").trim().toLowerCase();
        if (!cleanEmail) {
          throw new Error("Please enter your email address.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error("Please enter a valid email address.");
        }

        set({ loading: true });

        try {
          const response = await fetch("/api/auth/password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send", email: cleanEmail }),
          });

          const resData = await response.json();

          if (!response.ok || resData.error) {
            throw new Error(resData.error || "No account found for this email address.");
          }
        } catch (err: any) {
          if (err.message && err.message !== "Failed to fetch") {
            throw err;
          }
          const supabase = createClient();
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
          if (error) throw error;
        } finally {
          set({ loading: false });
        }
      },

      resetPasswordWithOtp: async ({ email, otp, password, confirmPassword }) => {
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanOtp = (otp || "").trim();

        if (!cleanEmail) {
          throw new Error("Please enter your email address.");
        }
        if (!cleanOtp || cleanOtp.length < 6) {
          throw new Error("Please enter the 6-digit OTP sent to your email.");
        }
        if (!password || password.length < 8) {
          throw new Error("New password must be at least 8 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        set({ loading: true });

        try {
          const response = await fetch("/api/auth/password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify",
              email: cleanEmail,
              token: cleanOtp,
              password,
            }),
          });

          const resData = await response.json();

          if (!response.ok || resData.error) {
            throw new Error(resData.error || "Failed to reset password.");
          }
        } catch (err: any) {
          if (err.message && !err.message.includes("fetch")) {
            throw err;
          }
          const supabase = createClient();
          let { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanOtp,
            type: "recovery",
          });

          if (verifyError) {
            const fallback = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token: cleanOtp,
              type: "email",
            });
            if (!fallback.error) {
              verifyData = fallback.data;
              verifyError = null;
            }
          }

          if (verifyError || !verifyData) {
            throw verifyError || new Error("Invalid or expired OTP. Please try again.");
          }

          const { error: updateError } = await supabase.auth.updateUser({
            password,
          });

          if (updateError) {
            throw updateError;
          }
        } finally {
          set({ loading: false });
        }
      },

      // ===============================
      // Login
      // ===============================

      login: async (email, password) => {
        const supabase = createClient();

        set({ loading: true });

        try {
          const normalizedEmail = email.trim().toLowerCase();

          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (error) {
            throw error;
          }

          if (!data.user) {
            throw new Error('User not found');
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          const resolvedRole = profile?.role?.toLowerCase() || 'customer';

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            role: resolvedRole,
            flowStage: 'authenticated',
            loading: false,
          });

          // Sync & Restore Database Cart
          useCartStore.getState().initializeUserCart(data.user.id);

          return { role: resolvedRole };
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // ===============================
      // Logout
      // ===============================

      logout: async () => {
        const supabase = createClient();

        await supabase.auth.signOut();

        set({
          user: null,
          session: null,
          isAuthenticated: false,
          role: "customer",
          flowStage: "register",
          pendingRegistration: null,
        });

        // Clear local cart state upon logout
        useCartStore.getState().resetUserCart();
      },

      // ===============================
      // Restore Session
      // ===============================

      getSession: async () => {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        let resolvedRole = 'customer';
        if (session?.user) {
          const userEmail = (session.user.email || '').toLowerCase().trim();
          if (userEmail === 'maladoddipavankalyan@gmail.com') {
            resolvedRole = 'super_admin';
          } else {
            try {
              const { data: profiles } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', session.user.id);
              const pRole = profiles && profiles.length > 0 ? profiles[0]?.role : '';
              resolvedRole = (pRole || session.user.app_metadata?.role || session.user.user_metadata?.role || 'customer').toLowerCase();
            } catch (pErr) {
              resolvedRole = (session.user.app_metadata?.role || session.user.user_metadata?.role || 'customer').toLowerCase();
            }
          }

          // Restore user database cart if session is active
          useCartStore.getState().initializeUserCart(session.user.id);
        }

        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          role: resolvedRole,
          flowStage: session ? "authenticated" : "register",
        });
      },

      // ===============================
      // Profile Update
      // ===============================

      updateProfile: async (data) => {
        const supabase = createClient();
        const currentUser = get().user;
        if (!currentUser) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('profiles')
          .update({
            name: `${data.firstName} ${data.lastName}`.trim(),
            phone: data.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);

        if (error) throw error;
      },

      resetFlow: () => set({ flowStage: 'register', pendingRegistration: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);
