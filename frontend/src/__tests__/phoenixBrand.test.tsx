import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { render, screen } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import PhoenixMark from '@/components/brand/PhoenixMark'
import Footer from '@/components/layout/Footer'
import RackHero from '@/components/home/RackHero'

let pathname = '/shop'
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
  default: ({ priority: _p, fill: _f, sizes: _s, ...rest }: ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => <img {...rest} />,
}))

const root = path.resolve(__dirname, '../..')
const pngSize = (file: string) => {
  const b = readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

describe('phoenix brand assets', () => {
  it('uses the phoenix as the browser tab icon (square PNG), replacing the old SVG icon', () => {
    const icon = path.join(root, 'src/app/icon.png')
    expect(existsSync(icon)).toBe(true)
    expect(existsSync(path.join(root, 'src/app/icon.svg'))).toBe(false)
    const { w, h } = pngSize(icon)
    expect(w).toBe(h)
  })

  it('provides an apple touch icon', () => {
    const icon = path.join(root, 'src/app/apple-icon.png')
    expect(existsSync(icon)).toBe(true)
    expect(pngSize(icon)).toEqual({ w: 180, h: 180 })
  })

  it('ships a cropped transparent phoenix for use on pages', () => {
    expect(existsSync(path.join(root, 'public/images/brand/phoenix.png'))).toBe(true)
  })
})

describe('PhoenixMark', () => {
  it('renders the phoenix with alt text by default', () => {
    render(<PhoenixMark className="w-10" />)
    expect(screen.getByAltText('WAR phoenix')).toHaveAttribute('src', '/images/brand/phoenix.png')
  })

  it('is hidden from screen readers when decorative', () => {
    const { container } = render(<PhoenixMark decorative />)
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})

describe('phoenix placement', () => {
  it('shows the phoenix in the footer brand block', () => {
    pathname = '/shop'
    render(<Footer />)
    expect(screen.getByRole('contentinfo').querySelector('img[src="/images/brand/phoenix.png"]')).not.toBeNull()
  })

  it('keeps the rack hero top bar text-only (no phoenix next to "Drop 01")', () => {
    render(<RackHero />)
    expect(screen.getByTestId('rack-topbar').querySelector('img[src="/images/brand/phoenix.png"]')).toBeNull()
  })
})

describe('Footer on the rack page', () => {
  it('is hidden on "/" so the rack page is only the rack', () => {
    pathname = '/'
    const { container } = render(<Footer />)
    expect(container).toBeEmptyDOMElement()
  })

  it('still shows on every other page', () => {
    pathname = '/products'
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})

describe('Footer theme', () => {
  it('follows the site light/dark theme on the shop page too (no forced theme)', () => {
    pathname = '/shop'
    render(<Footer />)
    expect(screen.getByRole('contentinfo').className).not.toMatch(/theme-/)
  })
})
