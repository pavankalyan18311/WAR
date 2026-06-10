'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, Sun, Moon } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Men', href: '/products', hasDropdown: true },
  { label: 'T-Shirts', href: '/products' },
  { label: 'Oversized', href: '/products?category=oversized' },
  { label: 'Premium', href: '/products?category=premium' },
  { label: 'Collections', href: '/collections' },
  { label: 'Sale', href: '/products?sale=true', isSale: true },
];

const MEN_DROPDOWN = [
  { label: 'Oversized T-Shirts', href: '/products?category=oversized' },
  { label: 'Graphic T-Shirts', href: '/products?category=graphic' },
  { label: 'Plain T-Shirts', href: '/products?category=plain' },
  { label: 'Polo T-Shirts', href: '/products?category=polo' },
  { label: 'Premium Collection', href: '/products?category=premium' },
];

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalItems = useCartStore((s) => s.getTotalItems());
  const openCart = useCartStore((s) => s.openCart);
  const wishlistCount = useWishlistStore((s) => s.getTotalItems());
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isDark = mounted && theme === 'dark';
  const iconBtn = 'p-2 rounded-lg transition-all duration-150 relative';

  return (
    <>
      {/* Announcement Bar */}
      <div
        className="text-center text-xs py-2.5 font-semibold tracking-widest"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
      >
        FREE SHIPPING ON ORDERS ABOVE Rs.999 &nbsp;|&nbsp; USE CODE{' '}
        <span className="font-black underline underline-offset-2">WELCOME10</span> FOR 10% OFF
      </div>

      {/* Main Header */}
      <header
        className={cn('sticky top-0 z-50 transition-all duration-300')}
        style={{
          background: isScrolled
            ? isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)'
            : 'var(--bg-card)',
          backdropFilter: isScrolled ? 'blur(16px)' : undefined,
          WebkitBackdropFilter: isScrolled ? 'blur(16px)' : undefined,
          borderBottom: '1px solid var(--border)',
          boxShadow: isScrolled ? 'var(--shadow-md)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                TX
              </div>
              <span className="text-xl font-black tracking-tight hidden sm:block" style={{ color: 'var(--fg)' }}>
                THREADX
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map((link) =>
                link.hasDropdown ? (
                  <div key={link.label} ref={dropdownRef} className="relative">
                    <button
                      onMouseEnter={() => setDropdownOpen(true)}
                      onMouseLeave={() => setDropdownOpen(false)}
                      onClick={() => setDropdownOpen((p) => !p)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {link.label}
                      <ChevronDown size={12} className={cn('transition-transform duration-200', dropdownOpen && 'rotate-180')} />
                    </button>
                    {dropdownOpen && (
                      <div
                        onMouseEnter={() => setDropdownOpen(true)}
                        onMouseLeave={() => setDropdownOpen(false)}
                        className="absolute top-full left-0 mt-1.5 w-52 rounded-xl overflow-hidden z-50 animate-fade-in"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                      >
                        {MEN_DROPDOWN.map((item) => (
                          <Link key={item.label} href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm font-medium"
                            style={{ color: 'var(--fg-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--fg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link key={link.label} href={link.href}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: link.isSale ? 'var(--danger)' : 'var(--fg-muted)', fontWeight: link.isSale ? 700 : undefined }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = link.isSale ? 'var(--danger)' : 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = link.isSale ? 'var(--danger)' : 'var(--fg-muted)'; e.currentTarget.style.background = ''; }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <button onClick={() => setSearchOpen(true)} className={iconBtn}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Search">
                <Search size={19} />
              </button>

              {mounted && (
                <button onClick={toggleTheme} className={iconBtn}
                  style={{ color: 'var(--fg-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  aria-label="Toggle theme">
                  {isDark ? <Sun size={19} /> : <Moon size={19} />}
                </button>
              )}

              <Link href={isAuthenticated ? '/account' : '/auth/login'}
                className={cn(iconBtn, 'hidden sm:flex items-center justify-center')}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Account">
                {mounted && isAuthenticated ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                ) : (
                  <User size={19} />
                )}
              </Link>

              <Link href="/wishlist"
                className={cn(iconBtn, 'hidden sm:flex items-center justify-center')}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Wishlist">
                <Heart size={19} />
                {mounted && wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ background: 'var(--danger)', color: '#fff' }}>
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button onClick={openCart} className={iconBtn}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Cart">
                <ShoppingBag size={19} />
                {mounted && totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                    {totalItems}
                  </span>
                )}
              </button>

              <button className={cn(iconBtn, 'md:hidden ml-0.5')}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                onClick={() => setMobileOpen((p) => !p)}
                aria-label="Menu">
                {mobileOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden px-4 py-4 space-y-1"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: link.isSale ? 'var(--danger)' : 'var(--fg)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <Link href={isAuthenticated ? '/account' : '/auth/login'}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--fg-muted)', background: 'var(--bg-elevated)' }}>
                <User size={15} /> Account
              </Link>
              <Link href="/wishlist" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--fg-muted)', background: 'var(--bg-elevated)' }}>
                <Heart size={15} /> Wishlist
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-fade-up"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
            <form onSubmit={handleSearch} className="flex items-center gap-3 px-5 py-4">
              <Search size={20} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
              <input ref={searchInputRef} type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search t-shirts, styles, colours..."
                className="flex-1 text-base outline-none bg-transparent"
                style={{ color: 'var(--fg)' }} />
              <button type="button" onClick={() => setSearchOpen(false)} className="p-1 rounded"
                style={{ color: 'var(--fg-subtle)' }}>
                <X size={18} />
              </button>
            </form>
            <div className="px-5 pb-4 pt-1 flex gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="w-full text-xs mb-2" style={{ color: 'var(--fg-subtle)' }}>Popular searches:</p>
              {['Oversized', 'Graphic Tees', 'Premium', 'New Arrivals', 'Sale'].map((tag) => (
                <button key={tag}
                  onClick={() => { router.push(`/products?search=${encodeURIComponent(tag)}`); setSearchOpen(false); }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-fg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
