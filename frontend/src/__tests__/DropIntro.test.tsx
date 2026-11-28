import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act, fireEvent } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import DropIntro from '@/components/home/DropIntro'
import { DROP_INTRO, SLIDE_MS } from '@/lib/dropIntro'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
  default: ({ priority: _p, fill: _f, sizes: _s, ...rest }: ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => <img {...rest} />,
}))

let reduced = false
beforeEach(() => {
  reduced = false
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: reduced && q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia
})
afterEach(() => { vi.useRealTimers() })

const slide = (n: number) => screen.getByRole('group', { name: `${n} of 5` })

describe('DROP_INTRO config', () => {
  it('shows the whole drop: six tees, each with its edited cut-out and product page', () => {
    expect(DROP_INTRO.tees.map((t) => t.name)).toEqual(['ASURA', 'CRIMSON BLADE', 'CURSED KING', 'GRID RUNNER', 'THUNDERCLAP', 'REDLINE'])
    for (const t of DROP_INTRO.tees) {
      expect(t.image).toBe(`/images/drop01/tee-${t.slug}.webp`)
      expect(t.href).toBe(`/products/${t.slug}`)
    }
  })

  it('has five looks from the shoot, true colour, each pointing at the tee being worn', () => {
    expect(DROP_INTRO.slides).toHaveLength(5)
    DROP_INTRO.slides.forEach((s, i) => {
      expect(s.image).toBe(`/images/drop01/look-${i + 1}.webp`)
      expect(s.href).toMatch(/^\/products\/[a-z-]+$/)
      expect(s.tee).toBeTruthy()
      expect(s.focus).toMatch(/^center \d+%$/)
    })
    expect(DROP_INTRO).not.toHaveProperty('banner')
  })
})

describe('DropIntro', () => {
  it('opens with a "Drop 01" headline and tagline', () => {
    render(<DropIntro />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/drop\s*01/i)
    expect(screen.getByText(DROP_INTRO.tagline)).toBeInTheDocument()
  })

  it('has a "Shop the drop" button down to the latest drop', () => {
    render(<DropIntro />)
    expect(screen.getByRole('link', { name: /shop the drop/i })).toHaveAttribute('href', '#latest-drop')
  })

  it('shows a slideshow of the five looks, starting on the first', () => {
    render(<DropIntro />)
    const show = screen.getByRole('region', { name: /lookbook/i })
    expect(show).toHaveAttribute('aria-roledescription', 'carousel')
    expect(within(show).getAllByRole('group', { hidden: true })).toHaveLength(5)
    expect(slide(1)).not.toHaveAttribute('aria-hidden', 'true')
    expect(within(slide(1)).getByRole('img')).toHaveAttribute('src', '/images/drop01/look-1.webp')
    expect(within(slide(1)).getByRole('img')).toHaveStyle({ objectPosition: DROP_INTRO.slides[0].focus })
    expect(show.querySelector('[aria-label="2 of 5"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('names the tee in the current look and links to it', () => {
    render(<DropIntro />)
    const first = DROP_INTRO.slides[0]
    expect(screen.getByRole('link', { name: new RegExp(`shop ${first.tee}`, 'i') })).toHaveAttribute('href', first.href)
  })

  it('moves to the next look on its own', () => {
    vi.useFakeTimers()
    render(<DropIntro />)
    act(() => { vi.advanceTimersByTime(SLIDE_MS + 50) })
    expect(slide(2)).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('jumps to a look from its marker, and can be paused', () => {
    vi.useFakeTimers()
    render(<DropIntro />)
    fireEvent.click(screen.getByRole('button', { name: 'Show look 4' }))
    expect(slide(4)).not.toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Show look 4' })).toHaveAttribute('aria-current', 'true')

    fireEvent.click(screen.getByRole('button', { name: /pause slideshow/i }))
    act(() => { vi.advanceTimersByTime(SLIDE_MS * 3) })
    expect(slide(4)).not.toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: /play slideshow/i })).toBeInTheDocument()
  })

  it('stays still for visitors who reduce motion', () => {
    reduced = true
    vi.useFakeTimers()
    render(<DropIntro />)
    act(() => { vi.advanceTimersByTime(SLIDE_MS * 2) })
    expect(slide(1)).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('still lines up all six tees, each linking to its product page', () => {
    render(<DropIntro />)
    const lineup = screen.getByRole('list', { name: /the drop/i })
    const links = within(lineup).getAllByRole('link')
    expect(links).toHaveLength(6)
    expect(links[0]).toHaveAttribute('href', '/products/asura')
    expect(within(lineup).getByAltText('ASURA — back print')).toHaveAttribute('src', '/images/drop01/tee-asura.webp')
  })
})
