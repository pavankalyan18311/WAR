import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RewardPointsToggle from '@/components/checkout/RewardPointsToggle';

describe('RewardPointsToggle (checkout)', () => {
  it('shows the balance and how much will be used, and toggles', () => {
    const onChange = vi.fn();
    render(<RewardPointsToggle balance={120} applied={0} checked={false} onChange={onChange} />);
    expect(screen.getByText(/120 points/)).toBeInTheDocument();
    expect(screen.getByText(/worth ₹120/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /use my reward points/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('when on, says exactly how much is being taken off (may be less than the balance)', () => {
    render(<RewardPointsToggle balance={500} applied={300} checked onChange={() => {}} />);
    expect(screen.getByText(/−₹300 applied/)).toBeInTheDocument();
    expect(screen.getByText(/200 points stay in your account/)).toBeInTheDocument();
  });

  it('renders nothing when the customer has no points', () => {
    const { container } = render(<RewardPointsToggle balance={0} applied={0} checked={false} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
