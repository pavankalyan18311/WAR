import crypto from 'crypto';

// Server-only Razorpay helpers. Keys come from env only — never hardcode fallbacks.
const keyId = () => process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? '';

export const razorpayConfigured = () => !!keyId() && !!keySecret();
export const razorpayKeyId = keyId;

function authHeader() {
  return 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64');
}

export function isValidPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  if (!keySecret() || !signature) return false;
  const expected = crypto.createHmac('sha256', keySecret()).update(`${razorpayOrderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function toDbPaymentMethod(method: string | undefined): 'upi' | 'card' | 'net_banking' | 'wallet' {
  switch ((method ?? '').toLowerCase()) {
    case 'upi': return 'upi';
    case 'netbanking': return 'net_banking';
    case 'wallet': return 'wallet';
    default: return 'card';
  }
}

async function razorpayFetch(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.description || `Razorpay request failed (${res.status})`);
  return data;
}

export const createRazorpayOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  razorpayFetch('/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  }) as Promise<{ id: string; amount: number; currency: string }>;

export const fetchRazorpayPayment = (paymentId: string) =>
  razorpayFetch(`/payments/${paymentId}`) as Promise<{
    id: string; order_id: string; amount: number; status: string; method?: string;
  }>;

export const refundRazorpayPayment = (paymentId: string, amountPaise: number, notes: Record<string, string>) =>
  razorpayFetch(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, notes }),
  }) as Promise<{ id: string; amount: number; status: string }>;

export const toPaise = (rupees: number) => Math.round(Number(rupees) * 100);
