'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/siteConfig';

const LINKS = {
  Shop: [
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Collections', href: '/collections' },
    { label: 'Best Sellers', href: '/products?sort=popular' },
    { label: 'All Products', href: '/products' },
  ],
  Help: [
    { label: 'Contact', href: '/contact' },
    { label: 'Shipping Policy', href: '/shipping-policy' },
    { label: 'Returns & Refunds', href: '/refund-policy' },
    { label: 'My Orders', href: '/account/orders' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
  ],
};

// Shown only when set in src/lib/siteConfig.ts
const SOCIAL = [
  { label: 'Instagram', href: siteConfig.instagramUrl },
  { label: 'WhatsApp', href: siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : '' },
].filter((s) => s.href);

const CONTACT = [siteConfig.supportEmail, siteConfig.supportPhone, siteConfig.address].filter(Boolean);

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="mt-auto w-full border-t" style={{ background: 'var(--bg)', borderColor: 'var(--border-strong)' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" className="font-display block leading-[0.95]" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)' }}>
              Without Any <em style={{ color: 'var(--accent)' }}>Regrets.</em>
            </Link>
            <p className="text-sm leading-relaxed mt-5 max-w-sm" style={{ color: 'var(--fg-muted)' }}>
              Heavyweight oversized tees, cut for an easy drape and made to be lived in.
            </p>
            {CONTACT.length > 0 && (
              <ul className="mt-6 space-y-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                {CONTACT.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
            {SOCIAL.length > 0 && (
              <div className="flex gap-6 mt-6">
                {SOCIAL.map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="link-rule text-[11px] font-semibold uppercase tracking-[0.2em]">
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, links], i) => (
            <div key={heading} className={i === 0 ? 'md:col-start-7 md:col-span-2' : 'md:col-span-2'}>
              <p className="eyebrow mb-5">{heading}</p>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-[var(--accent)]" style={{ color: 'var(--fg)' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em]"
          style={{ borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}>
          <p>&copy; {new Date().getFullYear()} WAR — Without Any Regrets</p>
          <p>Made in India</p>
        </div>
      </div>
    </footer>
  );
}
