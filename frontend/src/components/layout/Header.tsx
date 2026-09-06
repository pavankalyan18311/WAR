'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Search, User, ShoppingBag, Menu, X, ChevronDown, LogOut, Gift, Heart, Moon, Sun, Monitor, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
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
  const pathname = usePathname();

  // Hide storefront Header completely when inside Admin Dashboard
  if (pathname.startsWith('/admin')) {
    return null;
  }
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalItems = useCartStore((s) => s.getTotalItems());
  const openCart = useCartStore((s) => s.openCart);
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Sync session safely once
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        const currentUser = useAuthStore.getState().user;
        if ((session?.user?.id || null) !== (currentUser?.id || null)) {
          useAuthStore.setState({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
          });
        }
      }
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      authListener.subscription.unsubscribe();
    };
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
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
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

  const iconBtn = 'p-2 rounded-lg transition-all duration-150 relative cursor-pointer';
  const meta = user?.user_metadata || {};
  const firstName = meta.first_name || meta.name?.split(' ')[0] || (user as any)?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'Account');

  const openDropdown = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setDropdownOpen(true);
  };
  const closeDropdown = () => {
    dropdownTimerRef.current = setTimeout(() => setDropdownOpen(false), 150);
  };

  return (
    <>
      {/* Top Admin Banner when an Admin is viewing storefront */}
      {mounted && (['admin', 'super_admin', 'manager'].includes(useAuthStore.getState().role) || (user?.email || '').toLowerCase().trim() === 'maladoddipavankalyan@gmail.com') && (
        <div className="w-full py-2 px-4 flex items-center justify-between text-xs font-bold z-[100] shadow-md transition-all"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} />
            <span>STOREFRONT PREVIEW (ADMIN MODE)</span>
          </div>
          <Link href="/admin/dashboard" className="flex items-center gap-1 hover:underline font-extrabold tracking-wide">
            ← Return to Admin Dashboard
          </Link>
        </div>
      )}

      {/* Main Header */}
      <header
        className={cn('sticky top-0 z-50 transition-all duration-300')}
        style={{
          background: isScrolled ? 'var(--bg-card)' : 'color-mix(in srgb, var(--bg) 88%, transparent)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
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
                  style={{ color: 'var(--fg-muted)', letterSpacing: '0.04em' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.background = ''; }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              <button data-testid="header-search-trigger" onClick={() => setSearchOpen(true)} className={iconBtn}
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                aria-label="Search">
                <Search size={19} />
              </button>

              {/* Theme Selector Popover */}
              <div ref={themeRef} className="relative">
                <button
                  type="button"
                  onClick={() => setThemeMenuOpen((v) => !v)}
                  className={iconBtn}
                  style={{ color: 'var(--fg-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  aria-label="Select Theme Mode"
                  title={`Theme Mode: ${theme}`}
                >
                  {theme === 'system' ? <Monitor size={18} /> : resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {themeMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl overflow-hidden z-[70] p-1.5 animate-fade-in"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                    {[
                      { mode: 'light', label: 'Light', icon: Sun },
                      { mode: 'dark', label: 'Dark', icon: Moon },
                      { mode: 'system', label: 'System', icon: Monitor },
                    ].map(({ mode, label, icon: Icon }) => {
                      const isSelected = theme === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => { setTheme(mode as any); setThemeMenuOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          style={{
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? 'var(--primary-fg)' : 'var(--fg-muted)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'var(--bg-elevated)';
                              e.currentTarget.style.color = 'var(--fg)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--fg-muted)';
                            }
                          }}>
                          <div className="flex items-center gap-2">
                            <Icon size={14} />
                            <span>{label}</span>
                          </div>
                          {isSelected && <span className="text-[10px] font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isAuthenticated ? (
                <Link href="/auth/login" className={cn(iconBtn, 'hidden sm:flex items-center justify-center')}
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label="Profile">
                  <User size={19} />
                </Link>
              ) : (
                <div ref={profileRef} className="hidden sm:block relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((p) => !p)}
                    className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer"
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
                      
                      {/* Show Admin Suite Link if Logged User is Admin */}
                      {(['admin', 'super_admin', 'manager'].includes(useAuthStore.getState().role) || (user?.email || '').toLowerCase().trim() === 'maladoddipavankalyan@gmail.com') && (
                        <Link href="/admin/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-bold"
                          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                          <ShieldCheck size={15} />
                          Admin Dashboard
                        </Link>
                      )}

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
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium cursor-pointer"
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
                style={{ color: 'var(--fg)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                {link.label}
              </Link>
            ))}

            <div className="pt-3 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--fg-subtle)' }}>Theme Mode</p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {[
                  { mode: 'light', label: 'Light', icon: Sun },
                  { mode: 'dark', label: 'Dark', icon: Moon },
                  { mode: 'system', label: 'System', icon: Monitor },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode as any)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    style={{
                      background: theme === mode ? 'var(--primary)' : 'transparent',
                      color: theme === mode ? 'var(--primary-fg)' : 'var(--fg-muted)',
                    }}>
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

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
