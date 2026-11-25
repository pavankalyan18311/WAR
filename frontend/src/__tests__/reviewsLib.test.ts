import { describe, expect, it } from 'vitest';
import { authorLabel, parseReviewInput, ReviewInputError, summarizeRatings } from '@/lib/reviews';

describe('parseReviewInput', () => {
  it('accepts and tidies a valid review', () => {
    expect(parseReviewInput({ rating: 5, title: '  Great fit ', body: '  Soft fabric, true to size.  ' }))
      .toEqual({ rating: 5, title: 'Great fit', body: 'Soft fabric, true to size.' });
  });

  it('treats an empty title as no title', () => {
    expect(parseReviewInput({ rating: 4, title: '  ', body: 'Really nice tee overall.' }).title).toBeNull();
  });

  it.each([
    [{ rating: 0, body: 'Really nice tee overall.' }, 'Please choose a rating from 1 to 5 stars.'],
    [{ rating: 4.5, body: 'Really nice tee overall.' }, 'Please choose a rating from 1 to 5 stars.'],
    [{ rating: 4, body: 'Too short' }, 'Please write at least 10 characters.'],
    [{ rating: 4, body: 'x'.repeat(1501) }, 'Please keep your review under 1500 characters.'],
    [{ rating: 4, title: 'x'.repeat(81), body: 'Really nice tee overall.' }, 'Please keep the title under 80 characters.'],
  ])('rejects %j', (input, message) => {
    expect(() => parseReviewInput(input)).toThrow(new ReviewInputError(message));
  });
});

describe('summarizeRatings', () => {
  it('averages to one decimal and counts each star', () => {
    expect(summarizeRatings([5, 4, 4, 1])).toEqual({ average: 3.5, count: 4, breakdown: { 5: 1, 4: 2, 3: 0, 2: 0, 1: 1 } });
  });
  it('handles no reviews', () => {
    expect(summarizeRatings([])).toEqual({ average: 0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  });
});

describe('authorLabel', () => {
  it('shows first name and last initial only', () => {
    expect(authorLabel('Ravi Kumar Sharma')).toBe('Ravi S.');
    expect(authorLabel('Asha')).toBe('Asha');
    expect(authorLabel('')).toBe('WAR customer');
  });
});
