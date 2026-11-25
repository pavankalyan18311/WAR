// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const load = async () => {
  vi.resetModules();
  vi.stubEnv('SHIPROCKET_EMAIL', 'api@shop.in');
  vi.stubEnv('SHIPROCKET_PASSWORD', 'secret');
  return import('@/lib/shiprocket');
};
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const login = ok({ token: 'T' });

describe('Shiprocket shipment calls (real API)', () => {
  beforeEach(() => fetchMock.mockReset());

  it('assignAwb: asks Shiprocket to pick the courier and returns the AWB', async () => {
    fetchMock.mockResolvedValueOnce(login).mockResolvedValueOnce(ok({
      awb_assign_status: 1, response: { data: { awb_code: 'AWB9', courier_name: 'Xpressbees Surface' } },
    }));
    const { assignAwb } = await load();
    expect(await assignAwb('222')).toEqual({ success: true, awb_code: 'AWB9', courier_name: 'Xpressbees Surface' });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://apiv2.shiprocket.in/v1/external/courier/assign/awb');
    expect(JSON.parse(init.body)).toEqual({ shipment_id: '222' });
    expect(init.headers.Authorization).toBe('Bearer T');
  });

  it('assignAwb: returns Shiprocket\'s reason when no courier could be assigned', async () => {
    fetchMock.mockResolvedValueOnce(login).mockResolvedValueOnce(ok({
      awb_assign_status: 0, response: { data: { awb_assign_error: 'Insufficient wallet balance' } },
    }));
    const { assignAwb } = await load();
    expect(await assignAwb('222')).toEqual({ success: false, error: 'Insufficient wallet balance' });
  });

  it('schedulePickup and generateLabel', async () => {
    fetchMock.mockResolvedValueOnce(login)
      .mockResolvedValueOnce(ok({ pickup_status: 1, response: { pickup_scheduled_date: '2026-10-14' } }))
      .mockResolvedValueOnce(ok({ label_created: 1, label_url: 'https://kr-shipmultichannel.s3/label.pdf' }));
    const { schedulePickup, generateLabel } = await load();
    expect(await schedulePickup('222')).toEqual({ success: true });
    expect(await generateLabel('222')).toEqual({ success: true, label_url: 'https://kr-shipmultichannel.s3/label.pdf' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ shipment_id: ['222'] });
    expect(fetchMock.mock.calls[2][0]).toBe('https://apiv2.shiprocket.in/v1/external/courier/generate/label');
  });

  it('network errors become a failure, never a crash', async () => {
    fetchMock.mockResolvedValueOnce(login).mockRejectedValueOnce(new Error('ECONNRESET'));
    const { schedulePickup } = await load();
    expect(await schedulePickup('222')).toEqual({ success: false, error: 'ECONNRESET' });
  });
});
