import { describe, expect, it } from 'vitest';
import { DEFAULT_ANNOUNCEMENTS, HomeContentError, fillAnnouncement, parseAnnouncementsInput } from '@/lib/homeContent';

describe('announcement bar settings', () => {
  it('starts with the three store promises, keeping the amounts live', () => {
    expect(DEFAULT_ANNOUNCEMENTS).toEqual({
      enabled: true,
      items: ['Free shipping on orders above {free_shipping}', '{return_days}-day returns & size exchange', 'Cash on delivery available'],
    });
  });

  it('fills {free_shipping} and {return_days} from the store settings', () => {
    expect(fillAnnouncement('Free shipping above {free_shipping} · {return_days}-day returns', { freeShipping: '₹1,500', returnDays: 7 }))
      .toBe('Free shipping above ₹1,500 · 7-day returns');
    expect(fillAnnouncement('Drop 02 is live', { freeShipping: '₹1,500', returnDays: 7 })).toBe('Drop 02 is live');
  });

  it('cleans up the admin input', () => {
    expect(parseAnnouncementsInput({ enabled: false, items: ['  Drop 02 is live ', '', 'COD available'] }))
      .toEqual({ enabled: false, items: ['Drop 02 is live', 'COD available'] });
  });

  it.each([
    [{ items: [] }, 'Add at least one announcement.'],
    [{ items: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, 'Use at most 6 announcements.'],
    [{ items: ['x'.repeat(81)] }, 'Keep each announcement under 80 characters.'],
  ])('rejects bad input %#', (body, message) => {
    expect(() => parseAnnouncementsInput(body)).toThrow(HomeContentError);
    expect(() => parseAnnouncementsInput(body)).toThrow(message);
  });
});
