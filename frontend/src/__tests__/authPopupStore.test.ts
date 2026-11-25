import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthPopupStore, DEFAULT_POPUP_CONFIG } from '@/store/authPopupStore';

const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
}));

describe('authPopupStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthPopupStore.setState({ config: DEFAULT_POPUP_CONFIG });
  });

  it('has WAR-branded defaults with no stock photo', () => {
    expect(JSON.stringify(DEFAULT_POPUP_CONFIG)).not.toMatch(/threadx|unsplash/i);
  });

  it('loads the shared popup config saved by the admin', async () => {
    maybeSingle.mockResolvedValue({ data: { auth_popup: { headline: 'Drop 01 is live', delayMs: 5000 } }, error: null });
    await useAuthPopupStore.getState().loadConfig();
    expect(useAuthPopupStore.getState().config).toMatchObject({ headline: 'Drop 01 is live', delayMs: 5000, enabled: true });
  });

  it('saves through the admin API (not just this browser)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    useAuthPopupStore.getState().updateConfig({ headline: 'New headline' });
    await useAuthPopupStore.getState().saveConfig();
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin/settings', expect.objectContaining({ method: 'PUT' }));
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).auth_popup.headline).toBe('New headline');
  });

  it('throws when saving fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"Admin access required."}', { status: 403 }));
    await expect(useAuthPopupStore.getState().saveConfig()).rejects.toThrow('Admin access required.');
  });
});
