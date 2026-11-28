/**
 * The opening section of the shop page (/shop): a full-width slideshow of the Drop 01 shoot
 * behind the headline, then the six tees in a lineup.
 * Images live in /public/images/drop01/ — the looks are the original photos (true colour, only resized),
 * the tees are cut out of their studio backdrop.
 */
const tee = (slug: string, name: string) => ({ slug, name, image: `/images/drop01/tee-${slug}.webp`, href: `/products/${slug}` });
/** `focus` = CSS object-position: which part of the (portrait) photo stays in view on a wide screen. */
const look = (n: number, tee: string, slug: string, focus: string, alt: string) => ({ image: `/images/drop01/look-${n}.webp`, tee, href: `/products/${slug}`, focus, alt });

/** How long each look stays up in the slideshow. */
export const SLIDE_MS = 5000;

export const DROP_INTRO = {
  eyebrow: 'Now live — WAR',
  title: 'Drop 01',
  tagline: 'Six oversized tees. Zero regrets.',
  ctaLabel: 'Shop the drop',
  slides: [
    look(1, 'ASURA', 'asura', 'center 22%', 'Model holding a katana, back to camera, in the green ASURA tee'),
    look(2, 'CURSED KING', 'cursed-king', 'center 45%', 'Model from behind in the grey CURSED KING tee'),
    look(3, 'ASURA', 'asura', 'center 35%', 'Model drawing a katana in the green ASURA tee'),
    look(4, 'GRID RUNNER', 'grid-runner', 'center 50%', 'Model from behind in the sand GRID RUNNER tee'),
    look(5, 'ASURA', 'asura', 'center 60%', 'Top-down shot of a model kneeling in the ASURA tee'),
  ],
  tees: [
    tee('asura', 'ASURA'),
    tee('crimson-blade', 'CRIMSON BLADE'),
    tee('cursed-king', 'CURSED KING'),
    tee('grid-runner', 'GRID RUNNER'),
    tee('thunderclap', 'THUNDERCLAP'),
    tee('redline', 'REDLINE'),
  ],
};
