import { describe, it, expect } from 'vitest';
import { maskPhone } from '@/lib/maskPhone';

describe('maskPhone (printed labels)', () => {
  it('keeps the first two and last two digits', () => {
    expect(maskPhone('9876543210')).toBe('98XXXXXX10');
  });

  it('ignores the +91 prefix and spaces', () => {
    expect(maskPhone('+91 98765 43210')).toBe('98XXXXXX10');
  });

  it('hides very short or empty numbers completely', () => {
    expect(maskPhone('1234')).toBe('XXXX');
    expect(maskPhone('')).toBe('');
    expect(maskPhone(undefined)).toBe('');
  });
});
