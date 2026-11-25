# Feature Specification: Landing Page Rack Hero

## 1. Feature Name

Rack Hero — an animated clothing-rack hero for the home page.

## 2. Problem Statement

The current home hero (`HeroVideoBanner`) looks like a generic store banner. WAR sells a small range of
oversized tees, so the landing page should put the actual tees front and centre in a way that feels
physical and memorable: tees hanging on a rail that turn to face the visitor, as in the reference reel
(`frontend/reel screenshots/`).

## 3. Scope

### In scope
- A new `RackHero` section at the top of `src/app/page.tsx`, replacing `HeroVideoBanner` there.
- A white, minimal section: a thin horizontal rail with hangers and 5 tees hanging from it.
- Tees hang turned sideways (narrow); the active tee turns to face forward and is shown larger.
- Name of the active tee below it and a small pill CTA ("Shop the drop").
- The green Roronoa Zoro tee is the first active tee on page load.
- Hover the active tee to flip it from front view to back view.

### Out of scope
- Restyling any other home section (marquee, new in, collections, best sellers, reels, newsletter).
- Header, footer, WhatsApp button, product detail page.
- Admin editing of the rack line-up (static config for now).
- Deleting `HeroVideoBanner` (left in the codebase, just no longer rendered on the home page).

## 4. Functional Requirements

1. The rack shows exactly the tees in a static config `src/lib/rackHero.ts`, in config order.
2. Line-up (images copied to `public/images/rack/` with clean names):

   | Order | Tee | Front image (source) | Back image (source) |
   |---|---|---|---|
   | 1 | Grey washed (red collar print) | `10.23.36 PM (1).jpeg` | `10.23.36 PM.jpeg` |
   | 2 | Beige racing | `10.23.35 PM.jpeg` | `10.23.35 PM (1).jpeg` |
   | 3 | **Green Roronoa Zoro (default active)** | `10.23.37 PM (2).jpeg` | `10.23.35 PM (2).jpeg` |
   | 4 | Taupe patch | `10.23.36 PM (2).jpeg` | `10.23.37 PM.jpeg` |
   | 5 | Black lightning stripes | `10.23.37 PM (3).jpeg` | `10.23.37 PM (1).jpeg` |

   The Zoro tee sits in the middle so it starts centred on the rail.
3. On load the active tee is the one marked `featured: true` (Zoro).
4. Hover (desktop) or tap (touch) on an inactive tee makes it active.
5. When the visitor has not interacted for 4 s, the active tee advances to the next one, wrapping
   around. Any hover/tap/focus pauses auto-advance; it resumes after 4 s idle.
6. Keyboard: each tee is a focusable button; Left/Right arrows move the active tee; Enter on the
   active tee opens its link.
7. Hovering (or focusing) the active tee shows its back image; leaving shows the front again.
8. The active tee and the CTA link to the tee's `href` from config (defaults to `/products` until
   product slugs are mapped).
9. Below the rack: the active tee's name and the pill CTA.

## 5. Non-Functional Requirements

- Performance: images served with `next/image`; the default active tee is `priority`, others lazy.
  Animations use transform/opacity only (no layout thrash). No new animation library — use the
  already-installed `framer-motion`.
- Security: no new data access; static assets only.
- Reliability: if config is empty the section renders nothing and the page still works.
- Accessibility: each tee has alt text with its name and view (front/back); active tee exposed via
  `aria-pressed`/`aria-current`; `prefers-reduced-motion` disables sway, turning and auto-advance
  (tees still switch instantly).
- Visual: flat-lay photos sit on a white page using `mix-blend-mode: multiply` so their off-white
  backgrounds disappear. Inactive tees are narrowed with a `rotateY` turn and a gentle idle sway.
- Responsive: on phones the rack scrolls horizontally with snap; tap selects.

## 6. API / Data Contract Changes

- Endpoints: none.
- Request/response changes: none.
- DB schema/migration: none.

## 7. Architecture Constraints

- Layers/components to use:
  - `src/lib/rackHero.ts` — static data + pure helpers (`getInitialIndex`, `nextIndex`, `prevIndex`).
  - `src/components/home/RackHero.tsx` — client component, presentation + interaction only.
- Boundaries to preserve: `page.tsx` stays a server component; only `RackHero` is `'use client'`.
- Explicit anti-patterns to avoid: no data fetching in the component; no hard-coded tee data inside
  the component; no global CSS changes beyond a scoped class if needed.

## 8. Test Requirements (Mandatory)

- Unit tests (`src/__tests__/rackHero.test.ts`):
  - `getInitialIndex` returns the featured tee index; returns 0 when none is featured; config has
    exactly one featured tee.
  - `nextIndex` / `prevIndex` wrap around at both ends.
- Component tests (`src/__tests__/RackHero.test.tsx`):
  - Renders one button per tee; Zoro is active on load.
  - Hover/click on another tee makes it active and updates the caption.
  - Arrow keys move the active tee.
  - Auto-advance after 4 s idle (fake timers); paused while interacting.
  - Active tee shows back image on hover.
  - Reduced motion: no auto-advance.
  - Renders nothing for an empty line-up.
- E2E tests: update `e2e/homepage.spec.ts` to assert the rack hero is visible with the Zoro tee active.
- Edge cases: single tee (no auto-advance), missing back image (stay on front).

## 9. Acceptance Criteria

1. Opening `localhost:3000` shows a white rack with 5 tees and the green Zoro tee facing forward.
2. Hovering/tapping another tee turns it forward and updates the caption.
3. Hovering the active tee flips it to its back print.
4. With no interaction the rack cycles through the tees every 4 s.
5. All new unit/component tests and the updated e2e test pass; existing tests stay green.

## 10. Rollout / Risks

- Risks: flat-lay backgrounds are not pure white, so faint edges may show; the prints include
  third-party names/marks (e.g. "One Piece", "Formula 1", "RAWDAWG" label) — owner must confirm
  rights before going live.
- Mitigations: `multiply` blending; images can be swapped for cleaned cut-outs later by changing
  only `public/images/rack/` files.
- Rollback: render `HeroVideoBanner` again in `page.tsx` (one-line change).

## 11. Implementation Notes

- Tee display names and per-tee product links are placeholders until the owner confirms them.
- Build order (one TDD step each): config + helpers → static rack render → active selection →
  auto-advance → back-image flip → keyboard → reduced motion → wire into `page.tsx` → e2e.
