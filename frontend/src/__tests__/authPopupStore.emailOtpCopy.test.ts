import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthPopupStore } from '@/store/authPopupStore';

describe('Auth Popup Store - Email OTP copy', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthPopupStore.persist.clearStorage();
    useAuthPopupStore.getState().resetDefaults();
  });

  it('default CTA does not mention mobile OTP', () => {
    const cta = useAuthPopupStore.getState().config.ctaText;
    expect(cta.toLowerCase()).not.toContain('mobile otp');
  });
});
