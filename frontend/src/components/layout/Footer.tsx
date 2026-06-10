'use client';

import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const TwitterXIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.74-8.867L1.254 2.25H8.08l4.254 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
  </svg>
);

const LINKS = {
  Shop: [
    { label: 'All T-Shirts', href: '/products' },
    { label: 'Oversized', href: '/products?category=oversized' },
    { label: 'Graphic Tees', href: '/products?category=graphic' },
    { label: 'Premium Collection', href: '/products?category=premium' },
    { label: 'Sale Items', href: '/products?sale=true' },
  ],
  'AI Features': [
    { label: 'Virtual Try-On', href: '/try-on' },
    { label: 'AI Size Guide', href: '/size-guide' },
    { label: 'Style Assistant', href: '/#chatbot' },
    { label: 'Personalized Picks', href: '/for-you' },
  ],
  Support: [
    { label: 'Track Your Order', href: '/account/orders' },
    { label: 'Shipping Policy', href: '/shipping' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
  ],
};

const SOCIAL = [
  { label: 'Instagram', href: '#', icon: InstagramIcon },
  { label: 'Twitter', href: '#', icon: TwitterXIcon },
  { label: 'YouTube', href: '#', icon: YoutubeIcon },
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                TX
              </div>
              <span className="text-lg font-black tracking-tight" style={{ color: 'var(--fg)' }}>THREADX</span>
            </Link>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
              Premium quality t-shirts crafted for modern men. AI-powered shopping experience that eliminates doubt.
            </p>
            <div className="flex gap-2">
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-fg)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Nav Columns */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-black tracking-[0.25em] uppercase mb-4" style={{ color: 'var(--fg)' }}>{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--fg-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Bar */}
        <div className="mt-10 pt-8 flex flex-col sm:flex-row gap-4 sm:gap-8"
          style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { icon: Mail, text: 'support@threadx.in' },
            { icon: Phone, text: '+91 98765 43210' },
            { icon: MapPin, text: 'Bengaluru, Karnataka, India' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
              <Icon size={13} style={{ color: 'var(--fg-subtle)' }} />
              {text}
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
          <p>&copy; {new Date().getFullYear()} THREADX. All rights reserved.</p>
          <div className="flex gap-5">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((label) => (
              <Link key={label} href="#"
                className="transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
