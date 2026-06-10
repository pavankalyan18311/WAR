import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ChatWidget from '@/components/chat/ChatWidget';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ThreadX — Premium AI-Powered Men\'s Fashion',
  description:
    'Shop premium men\'s t-shirts with AI Virtual Try-On, Size Recommendation, and Personal Stylist. ThreadX — Made for the modern man.',
  keywords: 'men t-shirts, oversized, premium cotton, AI try-on, ThreadX',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? '';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <ThemeProvider>
          {!isAdmin && <Header />}
          <div className={isAdmin ? 'flex-1' : 'flex-1'}>{children}</div>
          {!isAdmin && <Footer />}
          {!isAdmin && <CartDrawer />}
          {!isAdmin && <ChatWidget />}
        </ThemeProvider>
      </body>
    </html>
  );
}

