/**
 * The reel videos are several MB each. None may download when the page opens: each one loads and plays
 * only while it is on screen, and pauses when it scrolls away (saves visitors' mobile data).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import InstagramReels from '@/components/home/InstagramReels'
import type { Reel } from '@/lib/homeContent'

type Entry = { target: Element; isIntersecting: boolean }
let observers: Array<{ cb: (e: Entry[]) => void; targets: Element[] }> = []

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', class {
    targets: Element[] = []
    constructor(public cb: (e: Entry[]) => void) { observers.push(this) }
    observe(el: Element) { this.targets.push(el) }
    unobserve() {}
    disconnect() {}
  })
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
})

const reel = (n: number): Reel => ({ id: `r${n}`, video_url: `https://cdn.example/reel${n}.mp4`, poster_url: `https://cdn.example/p${n}.jpg`, link_url: null, caption: `Reel ${n}`, sort_order: n, is_active: true } as unknown as Reel)
const show = (video: HTMLVideoElement, visible: boolean) => act(() => {
  for (const o of observers) if (o.targets.includes(video)) o.cb([{ target: video, isIntersecting: visible }])
})

describe('InstagramReels — data saving', () => {
  it('does not download any video when the page opens (poster only, no autoplay)', () => {
    const { container } = render(<InstagramReels reels={[reel(1), reel(2)]} instagramUrl={null} />)
    for (const v of container.querySelectorAll('video')) {
      expect(v.getAttribute('preload')).toBe('none')
      expect(v.hasAttribute('autoplay')).toBe(false)
      expect(v.getAttribute('src')).toBeNull()
      expect(v.getAttribute('poster')).toMatch(/^https:\/\/cdn\.example\/p\d\.jpg$/)
    }
  })

  it('loads and plays a reel only once it is on screen, and pauses it when it leaves', () => {
    const { container } = render(<InstagramReels reels={[reel(1), reel(2)]} instagramUrl={null} />)
    const [first, second] = Array.from(container.querySelectorAll('video'))

    show(first, true)
    expect(first.getAttribute('src')).toBe('https://cdn.example/reel1.mp4')
    expect(first.play).toHaveBeenCalled()
    expect(second.getAttribute('src')).toBeNull()

    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    show(first, false)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })
})
