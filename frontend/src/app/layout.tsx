import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ChatWidget from '@/components/chat/ChatWidget';
import PremiumAuthModal from '@/components/auth/PremiumAuthModal';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PageTransition from '@/components/ui/PageTransition';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WAR — Premium Oversized T-Shirts',
  description:
    'Shop premium oversized t-shirts. Focused on fit, fabric and timeless design. WAR — Made for the streets.',
  keywords: 'men t-shirts, oversized, premium cotton, WAR',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? '';
  const isAdmin = pathname.startsWith('/admin');
  const isAuthPage = pathname.startsWith('/auth');

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <ThemeProvider>
          {!isAdmin && <Header />}
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          {!isAdmin && <Footer />}
          {!isAdmin && <CartDrawer />}
          {!isAdmin && <ChatWidget />}
          {!isAdmin && !isAuthPage && <PremiumAuthModal />}
        </ThemeProvider>
      </body>
    </html>
  );
}

