import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signUp: vi.fn(async () => ({ data: {}, error: null })) } }),
}));

describe('Auth Store - what is saved in the browser', () => {
  it('never writes the password to localStorage', async () => {
    localStorage.clear();
    await useAuthStore.getState().submitRegistration({
      firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', dob: '',
      password: 'Sup3rSecret!', confirmPassword: 'Sup3rSecret!',
    });

    const saved = localStorage.getItem('auth-storage') ?? '';
    expect(saved).toContain('asha@example.com'); // email is still remembered for the OTP step
    expect(saved).not.toContain('Sup3rSecret!');
  });
});
