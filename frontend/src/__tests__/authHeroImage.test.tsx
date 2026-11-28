/**
 * The sign-in popup and the login/register pages show the current campaign photo ("hero image"),
 * not the old banner.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}))

import { AUTH_HERO_IMAGE } from '@/lib/authMedia'
import AuthShell from '@/components/auth/AuthShell'

const root = path.resolve(__dirname, '../..')

describe('sign-in picture', () => {
  it('is the new hero photo, shipped in /public', () => {
    expect(AUTH_HERO_IMAGE).toBe('/images/auth/hero.webp')
    expect(fs.existsSync(path.join(root, 'public', AUTH_HERO_IMAGE))).toBe(true)
  })

  it('is used on the login/register pages', () => {
    const { container } = render(<AuthShell eyebrow="x" title="y">form</AuthShell>)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(AUTH_HERO_IMAGE)
  })

  it('is the popup fallback — the old banner is gone from both', () => {
    for (const f of ['src/components/auth/PremiumAuthModal.tsx', 'src/components/auth/AuthShell.tsx']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8')
      expect(src).not.toContain('Hero_banner')
      expect(src).toContain('AUTH_HERO_IMAGE')
    }
  })
})
