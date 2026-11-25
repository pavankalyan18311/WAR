'use client';

import { siteConfig } from '@/lib/siteConfig';

/** Floating WhatsApp button — shown only once a real number is set in siteConfig. */
export default function ChatWidget() {
  if (!siteConfig.whatsappNumber) return null;
  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}`;

  return (
    <div className="fixed right-4 sm:right-6 z-50" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="whatsapp-cta"
        title="Chat on WhatsApp"
        className="group inline-flex items-center gap-2.5 h-12 pl-3.5 pr-3.5 sm:pr-4 border transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
        style={{ background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)', boxShadow: 'var(--shadow-md)' }}
        aria-label="Chat on WhatsApp"
      >
        <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.18em]">Chat with us</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M20.52 3.48A11.88 11.88 0 0 0 12 .06 11.9 11.9 0 0 0 1.5 11.55c0 2.07.54 4.06 1.56 5.83L.12 23.4l6.18-1.62A11.87 11.87 0 0 0 12 23.1c6.59 0 11.98-5.36 11.98-11.98 0-3.2-1.25-6.2-3.46-8.64zM12 21.36c-1.8 0-3.56-.48-5.08-1.38l-.36-.22-3.66.96.98-3.54-.24-.38A9.12 9.12 0 0 1 2.88 11.6 9.1 9.1 0 0 1 12 2.5c5.04 0 9.12 4.08 9.12 9.12S17.04 21.36 12 21.36zm5.06-7.86c-.28-.14-1.66-.82-1.92-.92-.26-.1-.45-.14-.64.14s-.74.92-.9 1.11c-.17.19-.34.21-.62.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.37-1.64-1.53-1.92-.16-.28-.02-.43.12-.57.12-.12.28-.31.42-.47.14-.16.19-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.64-1.54-.88-2.11-.23-.55-.46-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.34-.26.27-1 1-1 2.44s1.03 2.84 1.18 3.04c.14.19 2.04 3.13 4.94 4.39 2.89 1.27 2.89.85 3.41.8.52-.05 1.66-.68 1.9-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33z" />
        </svg>
      </a>
    </div>
  );
}
