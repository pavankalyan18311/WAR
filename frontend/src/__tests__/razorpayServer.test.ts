import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidPaymentSignature, toDbPaymentMethod, razorpayConfigured } from '@/lib/razorpayServer';

afterEach(() => vi.unstubAllEnvs());

describe('isValidPaymentSignature', () => {
  it('accepts the HMAC Razorpay sends and rejects anything else', () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'shh');
    const good = crypto.createHmac('sha256', 'shh').update('order_1|pay_1').digest('hex');
    expect(isValidPaymentSignature('order_1', 'pay_1', good)).toBe(true);
    expect(isValidPaymentSignature('order_1', 'pay_2', good)).toBe(false);
    expect(isValidPaymentSignature('order_1', 'pay_1', 'nonsense')).toBe(false);
  });

  it('never validates when the secret is missing', () => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    const sig = crypto.createHmac('sha256', '').update('o|p').digest('hex');
    expect(isValidPaymentSignature('o', 'p', sig)).toBe(false);
  });
});

describe('razorpayConfigured', () => {
  it('requires both key id and secret (no built-in fallbacks)', () => {
    vi.stubEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID', '');
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    expect(razorpayConfigured()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID', 'rzp_live_x');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'y');
    expect(razorpayConfigured()).toBe(true);
  });
});

describe('toDbPaymentMethod', () => {
  it.each([
    ['upi', 'upi'], ['card', 'card'], ['netbanking', 'net_banking'], ['wallet', 'wallet'], ['emi', 'card'],
  ])('%s → %s', (method, expected) => {
    expect(toDbPaymentMethod(method)).toBe(expected);
  });
});
