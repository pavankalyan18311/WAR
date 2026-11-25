import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RewardsPanel from '@/components/account/RewardsPanel';

const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });

describe('RewardsPanel (profile)', () => {
  it('shows balance in rupees, what expires soon, how it works, and the history', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({
      balance: 70,
      expiringSoon: { points: 10, date: '2026-10-20T00:00:00Z' },
      history: [
        { id: 'a', label: 'Earned on order WAR-ABCDEF12', points: 60, date: '2026-10-01T00:00:00Z', expires_at: '2026-12-30T00:00:00Z' },
        { id: 'b', label: 'Used on order WAR-12345678', points: -20, date: '2026-10-05T00:00:00Z', expires_at: null },
      ],
    }) });
    render(<RewardsPanel />);
    expect(await screen.findByText('70')).toBeInTheDocument();
    expect(screen.getByText(/worth ₹70/i)).toBeInTheDocument();
    expect(screen.getByText(/10 points expire on/i)).toBeInTheDocument();
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();          // how points are earned
    expect(screen.getByText(/90 days/i)).toBeInTheDocument();             // expiry rule
    expect(screen.getByText('Earned on order WAR-ABCDEF12')).toBeInTheDocument();
    expect(screen.getByText('+60')).toBeInTheDocument();
    expect(screen.getByText('−20')).toBeInTheDocument();
  });

  it('never reveals how many points each order earns (the slab rules stay private)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ balance: 10, expiringSoon: null, history: [] }) });
    const { container } = render(<RewardsPanel />);
    await screen.findByText('10');
    expect(container.textContent).not.toMatch(/1,000|50–100|50-100|up to 50/);
  });

  it('explains how to earn points when there are none yet', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ balance: 0, expiringSoon: null, history: [] }) });
    render(<RewardsPanel />);
    expect(await screen.findByText(/no points yet/i)).toBeInTheDocument();
  });
});
