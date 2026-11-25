// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmail = vi.fn(async (_m: any) => ({ sent: true }) as any);
vi.mock('@/lib/mailer', () => ({ sendEmail: (m: any) => sendEmail(m) }));

import { notifyRestocked } from '@/lib/stockAlerts';

type Row = Record<string, any>;
let alerts: Row[];

const variant = (id: string, size: string) => ({
  id, size_option: { name: size }, color: { name: 'Black' }, product: { name: 'Oversized Tee', slug: 'oversized-tee' },
});

function fakeDb() {
  return {
    from: () => {
      let filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      const matching = () => alerts.filter((r) => filters.every((f) => f(r)));
      const b: any = {
        select: () => b,
        in: (k: string, v: any[]) => { filters.push((r) => v.includes(r[k])); return b; },
        is: (k: string, v: any) => { filters.push((r) => (r[k] ?? null) === v); return b; },
        update: (p: Row) => { patch = p; return b; },
        then: (resolve: any) => {
          const rows = matching();
          if (patch) rows.forEach((r) => Object.assign(r, patch));
          return resolve({ data: rows, error: null });
        },
      };
      return b;
    },
  };
}

describe('notifyRestocked', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.test';
    sendEmail.mockClear();
    sendEmail.mockResolvedValue({ sent: true });
    alerts = [
      { id: 'a1', variant_id: 'v1', email: 'a@x.com', notified_at: null, variant: variant('v1', 'M') },
      { id: 'a2', variant_id: 'v1', email: 'b@x.com', notified_at: null, variant: variant('v1', 'M') },
      { id: 'a3', variant_id: 'v1', email: 'old@x.com', notified_at: '2026-01-01', variant: variant('v1', 'M') },
      { id: 'a4', variant_id: 'v2', email: 'c@x.com', notified_at: null, variant: variant('v2', 'L') },
    ];
  });

  it('emails everyone waiting for the restocked size, once, and marks them notified', async () => {
    const count = await notifyRestocked(fakeDb(), ['v1']);
    expect(count).toBe(2);
    expect(sendEmail.mock.calls.map((c) => c[0].to).sort()).toEqual(['a@x.com', 'b@x.com']);
    expect(sendEmail.mock.calls[0][0].subject).toContain('Oversized Tee');
    expect(sendEmail.mock.calls[0][0].html).toContain('https://shop.test/products/oversized-tee');
    expect(alerts.find((a) => a.id === 'a1')!.notified_at).toBeTruthy();
    expect(alerts.find((a) => a.id === 'a4')!.notified_at).toBeNull();

    sendEmail.mockClear();
    await notifyRestocked(fakeDb(), ['v1']);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('keeps a request pending if its email could not be sent', async () => {
    sendEmail.mockImplementation(async (m: any) => (m.to === 'a@x.com' ? { sent: false, reason: 'down' } : { sent: true }));
    await notifyRestocked(fakeDb(), ['v1']);
    expect(alerts.find((a) => a.id === 'a1')!.notified_at).toBeNull();
    expect(alerts.find((a) => a.id === 'a2')!.notified_at).toBeTruthy();
  });

  it('does nothing for no variants and never throws', async () => {
    expect(await notifyRestocked(fakeDb(), [])).toBe(0);
    const broken = { from: () => { throw new Error('db down'); } };
    await expect(notifyRestocked(broken, ['v1'])).resolves.toBe(0);
  });
});
