import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Marquee from '@/components/home/Marquee';
import InstagramReels from '@/components/home/InstagramReels';

describe('Marquee (admin-controlled banner)', () => {
  it('shows the admin texts in the chosen colours', () => {
    const { container } = render(<Marquee settings={{ enabled: true, items: ['Drop 02 is live', 'Free shipping ₹1500+'], background: '#F36E21', text_color: '#FFFFFF', accent_color: '#161412' }} />);
    const band = container.firstElementChild as HTMLElement;
    expect(band).toHaveStyle({ background: '#F36E21', color: '#FFFFFF' });
    expect(screen.getAllByText('Drop 02 is live').length).toBeGreaterThan(1); // repeated for the seamless loop
  });
  it('renders nothing when switched off', () => {
    const { container } = render(<Marquee settings={{ enabled: false, items: ['x'], background: '#000000', text_color: '#FFFFFF', accent_color: '#FFFFFF' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InstagramReels', () => {
  const reels = [
    { id: 'r1', video_url: 'https://cdn/1.mp4', poster_url: 'https://cdn/1.jpg', link_url: 'https://www.instagram.com/reel/AAA/', caption: 'Drop 02', sort_order: 1, is_active: true },
    { id: 'r2', video_url: 'https://cdn/2.mp4', poster_url: null, link_url: null, caption: null, sort_order: 2, is_active: true },
  ];

  it('plays every reel silently on a loop and links each one to Instagram', () => {
    const { container } = render(<InstagramReels reels={reels} instagramUrl="https://www.instagram.com/war.wear/" />);
    const videos = container.querySelectorAll('video');
    expect(videos).toHaveLength(2);
    videos.forEach((v) => {
      expect(v.muted).toBe(true);
      expect(v).toHaveAttribute('loop');
      expect(v).toHaveAttribute('playsinline');
      expect(v).toHaveAttribute('autoplay');
    });
    const links = screen.getAllByRole('link', { name: /watch on instagram/i });
    expect(links[0]).toHaveAttribute('href', 'https://www.instagram.com/reel/AAA/');
    expect(links[1]).toHaveAttribute('href', 'https://www.instagram.com/war.wear/'); // falls back to the profile
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /follow/i })).toHaveAttribute('href', 'https://www.instagram.com/war.wear/');
  });

  it('shows a link-only reel with Instagram’s own player, same size as the others', () => {
    const linkOnly = { id: 'r3', video_url: null, poster_url: null, link_url: 'https://www.instagram.com/reel/CCC/', caption: 'Drop 03', sort_order: 3, is_active: true };
    const { container } = render(<InstagramReels reels={[reels[0], linkOnly]} instagramUrl={null} />);
    const frame = container.querySelector('iframe')!;
    expect(frame).toHaveAttribute('src', 'https://www.instagram.com/reel/CCC/embed/');
    expect(frame).toHaveAttribute('title', 'Instagram reel: Drop 03');
    expect(frame).toHaveAttribute('loading', 'lazy');
    expect(frame.closest('[data-reel]')!.className).toContain('sm:w-[calc((100%-4rem)/5)]');
    expect(screen.getByRole('link', { name: 'Watch on Instagram: Drop 03' })).toHaveAttribute('href', 'https://www.instagram.com/reel/CCC/');
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });

  it('keeps a single reel reel-sized and centred instead of stretching it full width', () => {
    const { container } = render(<InstagramReels reels={[reels[0]]} instagramUrl={null} />);
    const link = container.querySelector('a[aria-label^="Watch on Instagram"]')!;
    expect(link.className).toContain('sm:w-[calc((100%-4rem)/5)]'); // one fifth of the row, like with five reels
    expect(link.parentElement!.className).toContain('sm:justify-center');
  });

  it('is hidden until reels are added', () => {
    const { container } = render(<InstagramReels reels={[]} instagramUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
