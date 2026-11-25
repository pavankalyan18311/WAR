import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductImage from '@/components/product/ProductImage';

describe('ProductImage', () => {
  it('shows the uploaded photo', () => {
    render(<div style={{ position: 'relative' }}><ProductImage src="https://abc.supabase.co/p.jpg" alt="Black Tee" /></div>);
    expect(screen.getByRole('img', { name: 'Black Tee' })).toBeInTheDocument();
  });

  it('shows a neutral placeholder (not a stock photo) when there is no photo', () => {
    render(<div style={{ position: 'relative' }}><ProductImage src="" alt="Black Tee" /></div>);
    expect(screen.queryByRole('img', { name: 'Black Tee' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Black Tee — no photo yet')).toBeInTheDocument();
  });
});
