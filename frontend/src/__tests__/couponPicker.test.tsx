import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CouponPicker from '@/components/checkout/CouponPicker';

const coupons = [
  { code: 'WELCOME10', title: '10% OFF', desc: '', expires: 'No expiry', discount_type: 'percentage', discount_value: 10, min_order_amount: 0 },
  { code: 'BIG200', title: '₹200 OFF', desc: 'On orders of ₹2000 or more.', expires: 'No expiry', discount_type: 'flat', discount_value: 200, min_order_amount: 2000 },
];
const fetchMock = vi.fn();
const auth = { isAuthenticated: true };
vi.mock('@/store/authStore', () => ({ useAuthStore: (sel?: (s: typeof auth) => unknown) => (sel ? sel(auth) : auth) }));
const onApply = vi.fn();
const onRemove = vi.fn();

beforeEach(() => {
  fetchMock.mockReset(); onApply.mockReset(); onRemove.mockReset();
  auth.isAuthenticated = true;
  fetchMock.mockImplementation(async (url: string, init?: any) => {
    if (url === '/api/coupons') return { ok: true, json: async () => ({ coupons }) };
    const { code } = JSON.parse(init.body);
    return code === 'WELCOME10'
      ? { ok: true, json: async () => ({ valid: true, discount: 120, coupon: { code: 'WELCOME10', discount_type: 'percentage', discount_value: 10 } }) }
      : { ok: true, json: async () => ({ valid: false, error: 'This coupon code is not valid.' }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('CouponPicker (checkout)', () => {
  it("lists the customer's available coupons and applies one with a tap", async () => {
    render(<CouponPicker subtotal={1200} appliedCode="" onApply={onApply} onRemove={onRemove} />);
    const card = (await screen.findByText('WELCOME10')).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('WELCOME10', 120, 'percentage'));
    expect(JSON.parse(fetchMock.mock.calls.find(([u]) => u === '/api/coupons/validate')![1].body)).toEqual({ code: 'WELCOME10', subtotal: 1200 });
  });

  it('shows how much more to add for a coupon with a minimum order, and does not let it be applied yet', async () => {
    render(<CouponPicker subtotal={1200} appliedCode="" onApply={onApply} onRemove={onRemove} />);
    const card = (await screen.findByText('BIG200')).closest('li')!;
    expect(card).toHaveTextContent('Add ₹800 more to use this');
    expect(within(card).getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  it('applies a typed code and shows the error for an invalid one', async () => {
    render(<CouponPicker subtotal={1200} appliedCode="" onApply={onApply} onRemove={onRemove} />);
    fireEvent.change(screen.getByLabelText(/coupon code/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply code$/i }));
    expect(await screen.findByText('This coupon code is not valid.')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows the applied coupon with a remove option instead of the list', async () => {
    render(<CouponPicker subtotal={1200} appliedCode="WELCOME10" onApply={onApply} onRemove={onRemove} />);
    expect(screen.getByText(/WELCOME10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove coupon/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('does not ask for saved coupons before the customer has signed in', async () => {
    auth.isAuthenticated = false;
    render(<CouponPicker subtotal={1200} appliedCode="" onApply={onApply} onRemove={onRemove} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock.mock.calls.some(([u]) => u === '/api/coupons')).toBe(false);
  });
});
