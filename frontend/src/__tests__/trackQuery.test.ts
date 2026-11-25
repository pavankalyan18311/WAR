import { describe, expect, it } from 'vitest';
import { trackingQuery } from '@/lib/tracking';

describe('trackingQuery (Track order search box)', () => {
  it('understands an order reference, an order id and a courier tracking number', () => {
    expect(trackingQuery(' war-3ca86545 ')).toEqual({ param: 'ref', value: 'WAR-3CA86545' });
    expect(trackingQuery('3ca86545-1111-2222-3333-444455556666')).toEqual({ param: 'order_id', value: '3ca86545-1111-2222-3333-444455556666' });
    expect(trackingQuery('SRK-DEV-303478447')).toEqual({ param: 'awb', value: 'SRK-DEV-303478447' });
    expect(trackingQuery(' 1490 1234 5678 ')).toEqual({ param: 'awb', value: '149012345678' });
  });
  it('ignores an empty box', () => {
    expect(trackingQuery('   ')).toBeNull();
  });
});
