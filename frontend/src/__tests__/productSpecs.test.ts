import { describe, expect, it } from 'vitest';
import { productSpecs } from '@/lib/productSpecs';

describe('productSpecs', () => {
  it('lists only the details the admin actually entered', () => {
    expect(productSpecs({ fabric: '100% Cotton', fit: 'oversized', neck_type: 'Crew', pattern: '', sleeve_type: null })).toEqual([
      { label: 'Fabric', value: '100% Cotton' },
      { label: 'Fit', value: 'Oversized' },
      { label: 'Neck', value: 'Crew' },
    ]);
  });

  it('returns nothing (no invented GSM / origin / bio-wash) when no details exist', () => {
    expect(productSpecs({})).toEqual([]);
  });
});
