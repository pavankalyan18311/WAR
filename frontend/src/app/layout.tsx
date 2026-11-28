import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

// Classic serif for headings + clean sans for everything else.
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz', 'SOFT'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ChatWidget from '@/components/chat/ChatWidget';
import BackToTop from '@/components/ui/BackToTop';
import PremiumAuthModal from '@/components/auth/PremiumAuthModal';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PageTransition from '@/components/ui/PageTransition';
import AuthInitializer from '@/components/auth/AuthInitializer';

export const metadata: Metadata = {
  title: 'WAR — Premium Oversized T-Shirts',
  description:
    'Shop premium oversized t-shirts. Focused on fit, fabric and timeless design. WAR — Made for the streets.',
  keywords: 'men t-shirts, oversized, premium cotton, WAR',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`h-full antialiased ${display.variable} ${sans.variable}`}
    >
      <body className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <ThemeProvider>
          <AuthInitializer />
          <div className="min-h-screen flex flex-col w-full flex-1">
            <Header />
            <main className="flex-1 w-full flex flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </div>
          <CartDrawer />
          <ChatWidget />
          <BackToTop />
          <PremiumAuthModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
