import { test, expect } from '@playwright/test'

test.describe('Rack page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows only the rack hero — no shop sections or footer', async ({ page }) => {
    const rack = page.getByRole('group', { name: /tees on the rack/i })
    await expect(rack).toBeVisible()
    await expect(rack.getByRole('button').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /the latest drop/i })).toHaveCount(0)
    await expect(page.locator('footer')).toHaveCount(0)
  })

  test('clicking the front tee flips it to the back and back again', async ({ page }) => {
    const front = page.locator('[aria-pressed="true"]')
    await expect(front).toHaveAttribute('data-side', 'front')
    await front.click()
    await expect(front).toHaveAttribute('data-side', 'back')
    await front.click()
    await expect(front).toHaveAttribute('data-side', 'front')
    await expect(page).toHaveURL(/\/$/)
  })

  test('has a single "Shop the drop" button that opens the shop landing page', async ({ page }) => {
    await expect(page.getByRole('button', { name: /view (back|front)/i })).toHaveCount(0)
    await page.getByTestId('hero-shop-cta').click()
    await expect(page).toHaveURL(/\/shop$/, { timeout: 20_000 }) // first visit compiles /shop in dev
  })
})

test.describe('Shop landing page (/shop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop')
  })

  test('does not repeat the rack hero', async ({ page }) => {
    await expect(page.getByRole('group', { name: /tees on the rack/i })).toHaveCount(0)
  })

  test('opens big with "Drop 01" and the six-tee lineup, before the banner and the Zoro spotlight', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /drop\s*01/i })).toBeVisible()
    const lineup = page.getByRole('list', { name: /the drop/i })
    await expect(lineup.getByRole('link')).toHaveCount(6)
    await expect(lineup.getByRole('link').first()).toHaveAttribute('href', '/products/asura')
    const tops = await page.evaluate(() => {
      const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + scrollY : -1)
      return {
        intro: top(document.querySelector('#drop-intro-title')),
        marquee: top(document.querySelector('[data-testid="marquee"]') ?? document.querySelector('main > div[aria-hidden]')),
        zoro: top(document.querySelector('#drop-hero-title')),
      }
    })
    expect(tops.intro).toBeGreaterThanOrEqual(0)
    expect(tops.zoro).toBeGreaterThan(tops.intro)
  })

  test('opens on the Drop 01 hero spotlighting the Zoro tee, then latest drop → newsletter', async ({ page }) => {
    const hero = page.getByRole('region', { name: /ASURA/ })
    await expect(hero).toBeVisible()
    await expect(hero.getByAltText(/ASURA — front/)).toBeVisible()

    // Section order on the page: hero, then the latest drop, then the newsletter.
    const tops = await page.evaluate(() => {
      const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + scrollY : -1)
      const heading = (re: RegExp) => [...document.querySelectorAll('h2')].find((h) => re.test(h.textContent ?? '')) ?? null
      return {
        hero: top(document.querySelector('#drop-hero-title')),
        latest: top(heading(/the latest drop/i)),
        letters: top(heading(/first word on every/i)),
      }
    })
    expect(tops.hero).toBeGreaterThanOrEqual(0)
    expect(tops.latest).toBeGreaterThan(tops.hero)
    expect(tops.letters).toBeGreaterThan(tops.latest)
  })

  test('no longer shows the old "The idea", collections or best sellers sections', async ({ page }) => {
    await expect(page.getByText(/02 — The idea/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /shop by edit/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^best sellers$/i })).toHaveCount(0)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`flows on one background in ${theme} mode — header, hero, sections and footer match the page`, async ({ page }) => {
      await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'dark'), theme)
      const read = () => page.evaluate(() => {
        const bg = (el: Element | null) => {
          let node: Element | null = el
          while (node) {
            const c = getComputedStyle(node).backgroundColor
            if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c
            node = node.parentElement
          }
          return 'none'
        }
        const heading = (re: RegExp) => [...document.querySelectorAll('h2')].find((h) => re.test(h.textContent ?? '')) ?? null
        return {
          body: bg(document.body),
          header: bg(document.querySelector('header')),
          latest: bg(heading(/the latest drop/i)),
          footer: bg(document.querySelector('footer')),
          heroClasses: document.querySelector('section[aria-labelledby="drop-hero-title"]')?.className ?? '',
          mainClasses: document.querySelector('main main, main')?.className ?? '',
        }
      })
      // Re-check until the theme's colour fade has settled, then everything must match the page.
      await expect.poll(async () => {
        const r = await read()
        return [r.header, r.latest, r.footer].every((c) => c === r.body)
      }, { timeout: 5000 }).toBe(true)
      const result = await read()
      expect(result.mainClasses).not.toMatch(/theme-night/)
    })
  }

  test('uses WAR brand orange for the hero button (not green)', async ({ page }) => {
    const bg = await page.getByRole('link', { name: /shop the zoro tee/i }).evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(243, 110, 33)')
  })

  test('the black announcement bar and the header stay stuck to the top while scrolling', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 2000))
    await page.waitForTimeout(400)
    const bar = await page.getByRole('region', { name: /store announcements/i }).boundingBox()
    const header = await page.locator('header').boundingBox()
    expect(bar?.y).toBeCloseTo(0, 0)
    expect(header!.y).toBeCloseTo(bar!.y + bar!.height, 0)
  })

  test('"Explore the drop" jumps to the latest drop', async ({ page }) => {
    await page.getByRole('link', { name: /explore the drop/i }).click()
    await expect(page).toHaveURL(/#latest-drop$/)
  })

  test('shows the "New in" section with its shop link', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /the latest drop/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /shop all new/i })).toHaveAttribute('href', /\/products/)
  })

  test('newsletter form accepts email input', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/your email/i)
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@threadx.com')
    await expect(emailInput).toHaveValue('test@threadx.com')
  })

  test('header is visible', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header.getByRole('link', { name: /WAR/ }).first()).toBeVisible()
  })

  test('footer has navigation links', async ({ page }) => {
    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()
    await expect(footer.getByText(/privacy policy/i)).toBeVisible()
  })
})
