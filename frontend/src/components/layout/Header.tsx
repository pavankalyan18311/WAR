'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, User, ShoppingBag, Menu, X, ChevronDown, LogOut, Gift, Heart, Moon, Sun } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'NEW DROPS', href: '/products' },
  { label: 'OVERSIZED COLLECTION', href: '/products?category=oversized' },
  { label: 'BEST SELLERS', href: '/products?sort=popular' },
  { label: 'ABOUT US', href: '/about' },
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalItems = useCartStore((s) => s.getTotalItems());
  const openCart = useCartStore((s) => s.openCart);
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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
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

  const iconBtn = 'p-2 rounded-lg transition-all duration-150 relative';
  const firstName = user?.first_name ?? user?.name?.split(' ')[0] ?? 'Guest';

  const openDropdown = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setDropdownOpen(true);
  };
  const closeDropdown = () => {
    dropdownTimerRef.current = setTimeout(() => setDropdownOpen(false), 150);
  };

  return (
    <>
      {/* Main Header */}
      <header
        className={cn('sticky top-0 z-50 transition-all duration-300')}
        style={{
          background: isScrolled ? 'rgba(10,10,10,0.92)' : 'rgba(10,10,10,0.72)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src="/images/War_Logo.png" alt="WAR logo" width={36} height={36} className="rounded-lg object-cover" />
              </Link>
            </div>

            {/* Desktop Nav (centered) */}
            <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 transform -translate-x-1/2">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} href={link.href}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.88)', letterSpacing: '0.04em' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.88)'; }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              <button data-testid="header-search-trigger" onClick={() => setSearchOpen(true)} className={iconBtn}
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Search">
                <Search size={19} />
              </button>

              <button
                onClick={toggleTheme}
                className={iconBtn}
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {!isAuthenticated ? (
                <Link href="/auth/login" className={cn(iconBtn, 'hidden sm:flex items-center justify-center')}
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  aria-label="Profile">
                  <User size={19} />
                </Link>
              ) : (
                <div ref={profileRef} className="hidden sm:block relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((p) => !p)}
                    className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg"
                    style={{ color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    aria-label="Account menu"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{firstName}</span>
                    <ChevronDown size={12} className={cn('transition-transform', profileOpen && 'rotate-180')} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-[70] animate-fade-in"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                      {[
                        { label: 'My Profile', href: '/account/profile', icon: User },
                        { label: 'My Orders', href: '/account/orders', icon: ShoppingBag },
                        { label: 'Wishlist', href: '/wishlist', icon: Heart },
                        { label: 'Saved Addresses', href: '/account/profile#addresses', icon: User },
                        { label: 'Rewards & Coupons', href: '/account/profile#rewards', icon: Gift },
                      ].map(({ label, href, icon: Icon }) => (
                        <Link key={label} href={href}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium"
                          style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--fg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                          <Icon size={14} />
                          {label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={async () => {
                          await useAuthStore.getState().logout();
                          setProfileOpen(false);
                          router.push('/');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium"
                        style={{ color: 'var(--danger)', borderTop: '1px solid var(--border)' }}
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button onClick={openCart} className={iconBtn}
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
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
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
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
                style={{ color: 'var(--fg)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
              style={{ color: 'var(--fg)', background: 'var(--bg-elevated)' }}
            >
              {theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            </button>
            <div className="pt-3 mt-2 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <Link href={isAuthenticated ? '/account/profile' : '/auth/login'}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--fg-muted)', background: 'var(--bg-elevated)' }}>
                <User size={15} /> Account
              </Link>
              <Link href="/cart" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--fg-muted)', background: 'var(--bg-elevated)' }}>
                <ShoppingBag size={15} /> Cart
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
              <input data-testid="header-search-input" ref={searchInputRef} type="text" value={searchQuery}
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
