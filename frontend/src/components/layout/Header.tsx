'use client';

import WarLogo from '@/components/brand/WarLogo';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, User, ShoppingBag, Menu, X, ChevronDown, LogOut, Gift, Heart, Moon, Sun, Monitor, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import { getCategories } from '@/lib/supabase/queries';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import SearchOverlay from '@/components/layout/SearchOverlay';

const NAV_LINKS = [
  { label: 'NEW DROPS', href: '/products?sort=newest' },
  { label: 'COLLECTIONS', href: '/collections' },
  { label: 'BEST SELLERS', href: '/products?sort=popular' },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // All hooks MUST be called before any conditional return (Rules of Hooks)
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getCategories().then((c) => setCategories(c as { id: string; name: string }[])).catch(() => {});
  }, []);

  const totalItems = useCartStore((s) => s.getTotalItems());
  const openCart = useCartStore((s) => s.openCart);
  const { isAuthenticated, user, role } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Keyboard shortcut: '/' (or Ctrl/⌘+K) opens search, like most modern stores.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Early return AFTER all hooks — admin layout has its own chrome
  if (pathname.startsWith('/admin')) return null;

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
      {mounted && isAuthenticated && ['admin', 'super_admin', 'manager'].includes(role) && (
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

      <AnnouncementBar />

      {/* Main Header */}
      <header
        className={cn('sticky top-0 z-50 transition-all duration-300')}
        style={{
          // Settles into a frosted paper bar with a soft shadow once the page scrolls.
          background: isScrolled ? 'color-mix(in srgb, var(--bg) 82%, transparent)' : 'var(--bg)',
          borderBottom: `1px solid ${isScrolled ? 'var(--border-strong)' : 'var(--border)'}`,
          backdropFilter: isScrolled ? 'blur(14px) saturate(140%)' : undefined,
          WebkitBackdropFilter: isScrolled ? 'blur(14px) saturate(140%)' : undefined,
          boxShadow: isScrolled ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-3" aria-label="WAR — Without Any Regrets, home">
                <span className="flex flex-col leading-none" style={{ color: 'var(--fg)' }}>
                  <WarLogo decorative className="h-[22px] sm:h-[26px] w-auto" />
                  <span className="hidden sm:block text-[8.5px] tracking-[0.3em] uppercase mt-1.5" style={{ color: 'var(--fg-subtle)' }}>Without Any Regrets</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav (centered) */}
            <nav className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} href={link.href}
                  className="nav-link py-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
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
                      
                      {/* Show Admin Suite Link only for admin roles */}
                      {['admin', 'super_admin', 'manager'].includes(role) && (
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

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} categories={categories} />
    </>
  );
}
