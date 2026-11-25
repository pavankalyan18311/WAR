// @vitest-environment node
/** Live check of the free address services. Run with: RUN_INTEGRATION=1 npx vitest run src/__tests__/integration */
import { describe, expect, it, vi } from 'vitest';
import { lookupPincode, reverseGeocode } from '@/lib/geo';

vi.setConfig({ testTimeout: 30_000 });

describe.skipIf(process.env.RUN_INTEGRATION !== '1')('Address services (live)', () => {
  it('India Post: pincode → city and state', async () => {
    expect(await lookupPincode('560001')).toMatchObject({ state: 'Karnataka' });
  });

  it('OpenStreetMap: coordinates → address with a pincode', async () => {
    const result = await reverseGeocode(12.9716, 77.5946); // central Bengaluru
    expect(result).toMatchObject({ state: 'Karnataka' });
    expect((result as any).pincode).toMatch(/^56\d{4}$/);
  });
});
