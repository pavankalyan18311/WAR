import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import DropHero from '@/components/home/DropHero'
import { DROP_HERO } from '@/lib/dropHero'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
  default: ({ priority: _p, fill: _f, sizes: _s, ...rest }: ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => <img {...rest} />,
}))

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => setReducedMotion(false))

describe('DROP_HERO config', () => {
  it('spotlights the green Zoro tee, led by the top-down back-print photo, under a WAR headline', () => {
    expect(DROP_HERO.name).toBe('ASURA')
    expect(DROP_HERO.ctaHref).toBe('/products/asura') // the real product page
    expect(DROP_HERO.kicker).toBe('Wear the war.')
    // zoro_ganesh (top-down), hero image (front with sword) and green hero 2 (back with sword) — not the close-up.
    expect(DROP_HERO.images).toEqual({
      main: '/images/drop01/zoro-top.webp', front: '/images/drop01/zoro-front.webp', back: '/images/drop01/zoro-back.webp',
    })
  })
})

describe('DropHero', () => {
  it('shows the drop name as the section heading with its tagline and copy', () => {
    render(<DropHero />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent(DROP_HERO.name)
    expect(heading).toHaveTextContent(DROP_HERO.kicker)
    expect(screen.getByRole('region', { name: new RegExp(DROP_HERO.name) })).toBeInTheDocument()
    expect(screen.getByText(DROP_HERO.copy)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(DROP_HERO.eyebrow))).toBeInTheDocument()
  })

  it('has a shop button and an "explore" link down to the latest drop', () => {
    render(<DropHero />)
    expect(screen.getByRole('link', { name: new RegExp(DROP_HERO.ctaLabel, 'i') })).toHaveAttribute('href', DROP_HERO.ctaHref)
    expect(screen.getByRole('link', { name: /explore the drop/i })).toHaveAttribute('href', '#latest-drop')
  })

  it('shows the top-down back print as the main photo, with the front and back-with-sword shots beside it', () => {
    render(<DropHero />)
    expect(screen.getByAltText(`${DROP_HERO.name} — back print, from above`)).toHaveAttribute('src', DROP_HERO.images.main)
    expect(screen.getByAltText(`${DROP_HERO.name} — front, with sword`)).toHaveAttribute('src', DROP_HERO.images.front)
    expect(screen.getByAltText(`${DROP_HERO.name} — back, with sword`)).toHaveAttribute('src', DROP_HERO.images.back)
    expect(screen.queryByAltText(/close-up/)).toBeNull()
  })

  it('keeps the spotlight on the Zoro tee — no "Also in Drop 01" list of other tees', () => {
    render(<DropHero />)
    expect(screen.queryByText(/also in drop 01/i)).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('is revealed straight away where scroll-reveal is not available', () => {
    render(<DropHero />)
    expect(screen.getByRole('region', { name: new RegExp(DROP_HERO.name) })).toHaveAttribute('data-inview', 'true')
  })

  it('moves the photos with the scroll (parallax)', () => {
    render(<DropHero />)
    fireEvent.scroll(window)
    expect(screen.getByRole('region', { name: new RegExp(DROP_HERO.name) }).style.getPropertyValue('--p')).not.toBe('')
  })

  it('keeps the photos still for visitors who prefer reduced motion', () => {
    setReducedMotion(true)
    render(<DropHero />)
    fireEvent.scroll(window)
    expect(screen.getByRole('region', { name: new RegExp(DROP_HERO.name) }).style.getPropertyValue('--p')).toBe('')
  })
})
