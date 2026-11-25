import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminOrdersPage from '@/app/admin/orders/page';

const row = (over: Record<string, unknown>) => ({
  id: 'o', reference: 'WAR-X', date: '2026-10-12', customer: 'Asha', email: 'a@x.com', phone: '', address: '', units: 1,
  total: 999, status: 'confirmed', payment: 'COD (pending)', paymentStatus: 'pending', tracking: '', items: [], abandoned: false, ...over,
});
const orders = [
  row({ id: '1', reference: 'WAR-PAID0001', status: 'confirmed', payment: 'RAZORPAY (paid)', paymentStatus: 'paid' }),
  row({ id: '2', reference: 'WAR-COD00002', status: 'confirmed' }),
  row({ id: '3', reference: 'WAR-ABND0003', status: 'pending', payment: 'RAZORPAY (pending)', abandoned: true }),
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ orders }) })));
});

describe('Admin → Orders: Shiprocket', () => {
  it('an order not yet in Shiprocket shows the problem and a Send to Shiprocket button', async () => {
    const fetchMock = vi.fn(async (url: string, init?: any) => init?.method
      ? { ok: true, json: async () => ({ success: true, status: 'ready' }) }
      : { ok: true, json: async () => ({ orders: [row({ id: '9', reference: 'WAR-SHIP0009', inShiprocket: false, shippingError: 'Could not send to Shiprocket: Wrong Pickup location entered.' })] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminOrdersPage />);
    fireEvent.click(await screen.findByRole('button', { name: /view WAR-SHIP0009/i }));
    expect(screen.getByText(/Wrong Pickup location entered/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send to shiprocket/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/shipping/create-order', expect.objectContaining({ method: 'POST', body: JSON.stringify({ order_id: '9' }) })));
  });

  it('a booked order shows the courier, tracking number and a label to print', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ orders: [row({ id: '8', reference: 'WAR-SHIP0008', inShiprocket: true, courier: 'Delhivery Surface', tracking: 'AWB123', labelUrl: 'https://l/1.pdf', shippingError: '' })] }) })));
    render(<AdminOrdersPage />);
    fireEvent.click(await screen.findByRole('button', { name: /view WAR-SHIP0008/i }));
    expect(screen.getByText(/Delhivery Surface/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /print label/i })).toHaveAttribute('href', 'https://l/1.pdf');
    expect(screen.queryByRole('button', { name: /send to shiprocket/i })).not.toBeInTheDocument();
  });
});

describe('Admin → Orders: abandoned payments', () => {
  it('hides unpaid online orders from the main list and the order count', async () => {
    render(<AdminOrdersPage />);
    expect(await screen.findByText('WAR-PAID0001')).toBeInTheDocument();
    expect(screen.getByText('WAR-COD00002')).toBeInTheDocument();
    expect(screen.queryByText('WAR-ABND0003')).not.toBeInTheDocument();
    expect(screen.getByText('Total Orders').previousSibling).toHaveTextContent('2');
  });

  it('shows them under "Abandoned payments", with a short explanation', async () => {
    render(<AdminOrdersPage />);
    await screen.findByText('WAR-PAID0001');
    fireEvent.click(screen.getByRole('button', { name: /abandoned payments \(1\)/i }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('WAR-ABND0003')).toBeInTheDocument();
    expect(within(table).queryByText('WAR-PAID0001')).not.toBeInTheDocument();
    expect(screen.getByText(/closed the payment window without paying/i)).toBeInTheDocument();
  });
});
