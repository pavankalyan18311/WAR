import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ChatWidget from '@/components/chat/ChatWidget';
import PremiumAuthModal from '@/components/auth/PremiumAuthModal';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PageTransition from '@/components/ui/PageTransition';

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
      className="h-full antialiased"
    >
      <body className="min-h-screen flex flex-col font-sans h-full" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col w-full flex-1">
            <Header />
            <main className="flex-1 w-full flex flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </div>
          <CartDrawer />
          <ChatWidget />
          <PremiumAuthModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
