// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addToMarketingList } from '@/lib/email/marketing';

describe('addToMarketingList (Brevo contacts)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BREVO_API_KEY', '');
    vi.stubEnv('BREVO_LIST_ID', '');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('does nothing until Brevo is configured', async () => {
    expect(await addToMarketingList('a@b.com')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds (or updates) the contact in the Brevo list', async () => {
    vi.stubEnv('BREVO_API_KEY', 'xkey');
    vi.stubEnv('BREVO_LIST_ID', '7');
    fetchMock.mockResolvedValue({ ok: true, status: 201 });

    expect(await addToMarketingList('a@b.com')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/contacts');
    expect(init.headers['api-key']).toBe('xkey');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', listIds: [7], updateEnabled: true });
  });

  it('never throws when Brevo is down', async () => {
    vi.stubEnv('BREVO_API_KEY', 'xkey');
    vi.stubEnv('BREVO_LIST_ID', '7');
    fetchMock.mockRejectedValue(new Error('network'));
    expect(await addToMarketingList('a@b.com')).toBe(false);
  });
});
