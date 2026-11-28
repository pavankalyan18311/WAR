import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import RackHero from '@/components/home/RackHero'
import { RACK_TEES, type RackTee } from '@/lib/rackHero'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
  default: ({ priority: _p, fill: _f, sizes: _s, ...rest }: ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => <img {...rest} />,
}))

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const teeButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const caption = () => screen.getByTestId('rack-caption')

beforeEach(() => {
  push.mockReset()
  setReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('RackHero', () => {
  it('renders one button per tee with the Zoro tee active on load', () => {
    render(<RackHero />)
    for (const t of RACK_TEES) expect(teeButton(t.name)).toBeInTheDocument()
    expect(teeButton('Three Sword Jersey')).toHaveAttribute('aria-pressed', 'true')
    expect(teeButton('Ashen Halo Tee')).toHaveAttribute('aria-pressed', 'false')
    expect(caption()).toHaveTextContent('Three Sword Jersey')
  })

  it('shows only the tee name (no price) and one "Shop the drop" button to the landing page', () => {
    render(<RackHero />)
    expect(caption()).toHaveTextContent(/^Three Sword Jersey$/)
    expect(caption()).not.toHaveTextContent('₹')
    expect(screen.getByRole('link', { name: /shop the drop/i })).toHaveAttribute('href', '/shop')
    expect(screen.queryByRole('button', { name: /view (back|front)/i })).toBeNull()
  })

  it('sends "Shop the drop" wherever it is told to', () => {
    render(<RackHero shopHref="/somewhere" />)
    expect(screen.getByRole('link', { name: /shop the drop/i })).toHaveAttribute('href', '/somewhere')
  })

  it('makes a tee active when hovered', () => {
    render(<RackHero />)
    fireEvent.mouseEnter(teeButton('Grid Runner Tee'))
    expect(teeButton('Grid Runner Tee')).toHaveAttribute('aria-pressed', 'true')
    expect(teeButton('Three Sword Jersey')).toHaveAttribute('aria-pressed', 'false')
    expect(caption()).toHaveTextContent('Grid Runner Tee')
  })

  it('makes a tee active when tapped, showing its front', () => {
    render(<RackHero />)
    fireEvent.click(teeButton('Ember Patch Tee'))
    expect(teeButton('Ember Patch Tee')).toHaveAttribute('aria-pressed', 'true')
    expect(teeButton('Ember Patch Tee')).toHaveAttribute('data-side', 'front')
  })

  it('clicking the active tee flips it to the back, and clicking again flips it to the front — it never opens a page', () => {
    render(<RackHero />)
    const zoro = teeButton('Three Sword Jersey')
    expect(zoro).toHaveAttribute('data-side', 'front')
    fireEvent.click(zoro)
    expect(zoro).toHaveAttribute('data-side', 'back')
    fireEvent.click(zoro)
    expect(zoro).toHaveAttribute('data-side', 'front')
    expect(push).not.toHaveBeenCalled()
  })

  it('does not flip just from hovering the active tee', () => {
    render(<RackHero />)
    const zoro = teeButton('Three Sword Jersey')
    fireEvent.mouseEnter(zoro)
    expect(zoro).toHaveAttribute('data-side', 'front')
  })

  it('moving to another tee shows that tee from the front', () => {
    render(<RackHero />)
    fireEvent.click(teeButton('Three Sword Jersey'))
    fireEvent.click(teeButton('Grid Runner Tee'))
    expect(teeButton('Grid Runner Tee')).toHaveAttribute('data-side', 'front')
  })

  it('moves the active tee with the arrow keys', () => {
    render(<RackHero />)
    const rail = screen.getByRole('group', { name: /tees on the rack/i })
    fireEvent.keyDown(rail, { key: 'ArrowRight' })
    expect(caption()).toHaveTextContent('Ember Patch Tee')
    fireEvent.keyDown(rail, { key: 'ArrowLeft' })
    fireEvent.keyDown(rail, { key: 'ArrowLeft' })
    expect(caption()).toHaveTextContent('Grid Runner Tee')
  })

  it('auto-advances to the next tee after 4 seconds idle, wrapping around', () => {
    vi.useFakeTimers()
    render(<RackHero />)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(caption()).toHaveTextContent('Ember Patch Tee')
    act(() => { vi.advanceTimersByTime(4000) })
    expect(caption()).toHaveTextContent('Thunder Stripe Tee')
    act(() => { vi.advanceTimersByTime(4000) })
    expect(caption()).toHaveTextContent('Ashen Halo Tee')
  })

  it('pauses auto-advance while the pointer is over the rack', () => {
    vi.useFakeTimers()
    render(<RackHero />)
    const rail = screen.getByRole('group', { name: /tees on the rack/i })
    fireEvent.mouseEnter(rail)
    act(() => { vi.advanceTimersByTime(12000) })
    expect(caption()).toHaveTextContent('Three Sword Jersey')
    fireEvent.mouseLeave(rail)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(caption()).toHaveTextContent('Ember Patch Tee')
  })

  it('does not auto-advance when the visitor prefers reduced motion', () => {
    setReducedMotion(true)
    vi.useFakeTimers()
    render(<RackHero />)
    act(() => { vi.advanceTimersByTime(12000) })
    expect(caption()).toHaveTextContent('Three Sword Jersey')
  })

  it('does not auto-advance with a single tee', () => {
    vi.useFakeTimers()
    const one: RackTee[] = [RACK_TEES[2]]
    render(<RackHero tees={one} />)
    act(() => { vi.advanceTimersByTime(12000) })
    expect(caption()).toHaveTextContent('Three Sword Jersey')
  })

  it('pushes the tees when the mouse brushes across the rack, then lets them settle', () => {
    vi.useFakeTimers()
    render(<RackHero />)
    const rail = screen.getByRole('group', { name: /tees on the rack/i })
    const move = new MouseEvent('pointermove', { bubbles: true, movementX: 10 })
    Object.defineProperty(move, 'pointerType', { value: 'mouse' })
    fireEvent(rail, move)
    expect(rail.style.getPropertyValue('--push')).toBe('-6deg')
    act(() => { vi.advanceTimersByTime(200) })
    expect(rail.style.getPropertyValue('--push')).toBe('0deg')
  })

  it('renders nothing for an empty line-up', () => {
    const { container } = render(<RackHero tees={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('gives each tee image descriptive alt text', () => {
    render(<RackHero />)
    expect(screen.getByAltText('Three Sword Jersey — front')).toBeInTheDocument()
    expect(screen.getByAltText('Three Sword Jersey — back')).toBeInTheDocument()
  })
})

describe('RackHero — tee without a back photo', () => {
  it('stays on the front when clicked', () => {
    const noBack: RackTee[] = [{ ...RACK_TEES[2], back: undefined }, RACK_TEES[1]]
    render(<RackHero tees={noBack} />)
    const zoro = screen.getByRole('button', { name: /^Three Sword Jersey/ })
    fireEvent.click(zoro)
    expect(zoro).toHaveAttribute('data-side', 'front')
    expect(screen.queryByAltText('Three Sword Jersey — back')).toBeNull()
  })

  describe('on a phone', () => {
    const rack = () => screen.getByRole('group', { name: /tees on the rack/i })
    const swipe = (fromX: number, toX: number) => {
      fireEvent.touchStart(rack(), { touches: [{ clientX: fromX, clientY: 300 }] })
      fireEvent.touchEnd(rack(), { changedTouches: [{ clientX: toX, clientY: 305 }] })
    }
    const at = (offset: number) => {
      const start = RACK_TEES.findIndex((t) => t.name === 'Three Sword Jersey')
      return RACK_TEES[(start + offset + RACK_TEES.length) % RACK_TEES.length].name
    }

    it('swiping left brings the next tee forward, swiping right the previous one', () => {
      render(<RackHero />)
      swipe(300, 120)
      expect(caption()).toHaveTextContent(at(1))
      swipe(100, 300)
      swipe(100, 300)
      expect(caption()).toHaveTextContent(at(-1))
    })

    it('a small finger movement is a tap, not a swipe', () => {
      render(<RackHero />)
      swipe(200, 185)
      expect(caption()).toHaveTextContent('Three Sword Jersey')
    })

    it('tells phone visitors they can swipe and tap to flip', () => {
      render(<RackHero />)
      expect(screen.getByText(/swipe/i)).toHaveTextContent(/tap.*flip/i)
    })
  })
})
