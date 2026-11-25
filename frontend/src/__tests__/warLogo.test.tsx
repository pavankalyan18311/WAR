import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarLogo from '@/components/brand/WarLogo';

describe('WarLogo', () => {
  it('is the WAR mark: dark letters follow the text colour (works in dark mode), the R stays brand orange', () => {
    render(<WarLogo className="h-8" />);
    const svg = screen.getByRole('img', { name: 'WAR' });
    expect(svg).toHaveAttribute('viewBox', '560 1700 1880 470'); // cropped to the artwork
    const paths = svg.querySelectorAll('path');
    expect(paths).toHaveLength(3);
    expect(paths[0]).toHaveAttribute('fill', 'currentColor');
    expect(paths[2]).toHaveAttribute('fill', '#F36E21');
  });

  it('can be decorative when a text label is next to it', () => {
    const { container } = render(<WarLogo decorative />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
