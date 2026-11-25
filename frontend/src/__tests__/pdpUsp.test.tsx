import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImageLightbox from '@/components/product/ImageLightbox';
import ShareMenu from '@/components/product/ShareMenu';
import StickyBuyBar from '@/components/product/StickyBuyBar';
import BackInStockForm from '@/components/product/BackInStockForm';
import ProductGallery from '@/components/product/ProductGallery';

const images = [{ url: 'https://x.test/1.jpg' }, { url: 'https://x.test/2.jpg' }, { url: 'https://x.test/3.jpg' }];

describe('ImageLightbox', () => {
  it('opens on the chosen image, moves with arrow keys / buttons and closes with Esc', () => {
    const onClose = vi.fn();
    render(<ImageLightbox images={images} startIndex={1} alt="Tee" onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: /image viewer/i });
    expect(dialog).toHaveTextContent('2 / 3');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(dialog).toHaveTextContent('3 / 3');
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // wraps
    expect(dialog).toHaveTextContent('1 / 3');
    fireEvent.click(screen.getByRole('button', { name: /previous image/i }));
    expect(dialog).toHaveTextContent('3 / 3');
    fireEvent.click(screen.getByRole('button', { name: 'View image 2' }));
    expect(dialog).toHaveTextContent('2 / 3');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('is rendered into document.body (above the header) and locks page scroll while open', () => {
    const { unmount } = render(<ImageLightbox images={images} startIndex={0} alt="Tee" onClose={() => {}} />);
    expect(screen.getByRole('dialog').parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ProductGallery', () => {
  it('keeps the test ids, switches with thumbnails and opens the viewer on the shown image', () => {
    render(<ProductGallery images={images} alt="Tee" />);
    fireEvent.click(screen.getByTestId('pdp-thumb-1'));
    fireEvent.click(screen.getByTestId('pdp-main-image'));
    expect(screen.getByRole('dialog', { name: /image viewer/i })).toHaveTextContent('2 / 3');
    fireEvent.click(screen.getByRole('button', { name: /close image viewer/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('phones: swipeable slides with dot indicators that open the viewer', () => {
    render(<ProductGallery images={images} alt="Tee" />);
    expect(screen.getAllByRole('button', { name: /^go to image/i })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Open image 3' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('3 / 3');
  });

  it('shows a placeholder and no viewer when there are no images', () => {
    render(<ProductGallery images={[]} alt="Tee" />);
    fireEvent.click(screen.getByTestId('pdp-main-image'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ShareMenu', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
  });

  it('offers WhatsApp and copy link', async () => {
    render(<ShareMenu title="Oversized Tee" url="https://shop.test/products/tee" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    const wa = screen.getByRole('menuitem', { name: /whatsapp/i });
    expect(wa).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent('Oversized Tee https://shop.test/products/tee')}`);
    expect(wa).toHaveAttribute('target', '_blank');

    fireEvent.click(screen.getByRole('menuitem', { name: /copy link/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://shop.test/products/tee'));
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  it('uses the phone share sheet when available', async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<ShareMenu title="Oversized Tee" url="https://shop.test/products/tee" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /more options/i }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Oversized Tee', url: 'https://shop.test/products/tee' }));
  });
});

describe('StickyBuyBar', () => {
  let observerCallback: (entries: { isIntersecting: boolean }[]) => void;
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: any) { observerCallback = cb; }
      observe() {} disconnect() {} unobserve() {}
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function Harness(props: Partial<React.ComponentProps<typeof StickyBuyBar>>) {
    const target = { current: document.createElement('div') };
    return <StickyBuyBar targetRef={target} name="Oversized Tee" price="₹999" selectedSize={null}
      actionLabel="Add to cart" onAction={() => {}} onChooseSize={() => {}} {...props} />;
  }

  it('appears only once the main Add to cart button scrolls out of view', () => {
    render(<Harness />);
    expect(screen.queryByTestId('sticky-buy-bar')).not.toBeInTheDocument();
    act(() => observerCallback([{ isIntersecting: false }]));
    expect(screen.getByTestId('sticky-buy-bar')).toHaveClass('md:hidden');
    act(() => observerCallback([{ isIntersecting: true }]));
    expect(screen.queryByTestId('sticky-buy-bar')).not.toBeInTheDocument();
  });

  it('asks for a size first, then adds to cart', () => {
    const onAction = vi.fn();
    const onChooseSize = vi.fn();
    const { rerender } = render(<Harness onAction={onAction} onChooseSize={onChooseSize} />);
    act(() => observerCallback([{ isIntersecting: false }]));
    fireEvent.click(screen.getByRole('button', { name: /select size/i }));
    expect(onChooseSize).toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    rerender(<Harness onAction={onAction} onChooseSize={onChooseSize} selectedSize="M" />);
    expect(screen.getByTestId('sticky-buy-bar')).toHaveTextContent('Size M');
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('BackInStockForm', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('prefills the signed-in email and confirms the request', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<BackInStockForm variantId="v1" size="M" defaultEmail="asha@x.com" />);
    expect(screen.getByLabelText(/email for restock alert/i)).toHaveValue('asha@x.com');
    fireEvent.click(screen.getByRole('button', { name: /notify me/i }));
    expect(await screen.findByText(/we.ll email you when size M is back/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/stock-alerts', expect.objectContaining({ method: 'POST', body: JSON.stringify({ variant_id: 'v1', email: 'asha@x.com' }) }));
  });

  it('shows the server message when the request is refused', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Good news — this size is in stock. You can order it now.' }) });
    render(<BackInStockForm variantId="v1" size="M" />);
    fireEvent.change(screen.getByLabelText(/email for restock alert/i), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: /notify me/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('this size is in stock');
  });
});
