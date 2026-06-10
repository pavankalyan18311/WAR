'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminStore } from '@/store/adminStore';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderOpen,
  Tag,
  ShoppingCart,
  Users,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: ShoppingBag },
  { label: 'Collections', href: '/admin/collections', icon: FolderOpen },
  { label: 'Coupons & Offers', href: '/admin/coupons', icon: Tag },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isAuthenticated, logout } = useAdminStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [mounted, isAuthenticated, pathname, router]);

  // Don't wrap the login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              TX
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">THREADX</div>
              <div className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                <ShieldCheck size={10} />
                Admin Panel
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded"
            style={{ color: 'var(--fg-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
                style={{
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--primary-fg)' : 'var(--fg-muted)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--bg-subtle)';
                    e.currentTarget.style.color = 'var(--fg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--fg-muted)';
                  }
                }}
              >
                <Icon size={16} className="shrink-0" />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Admin user info */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
            style={{ background: 'var(--bg-subtle)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {admin?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{admin?.name}</div>
              <div className="text-xs capitalize" style={{ color: 'var(--fg-muted)' }}>
                {admin?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--fg-muted)';
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg"
            style={{ color: 'var(--fg-muted)' }}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <span>Admin</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--fg)' }} className="font-medium">
              {NAV_ITEMS.find(
                (n) => pathname === n.href || (n.href !== '/admin/dashboard' && pathname.startsWith(n.href))
              )?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              className="relative p-2 rounded-lg transition-all"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-subtle)';
                e.currentTarget.style.color = 'var(--fg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--fg-muted)';
              }}
            >
              <Bell size={18} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--danger, #ef4444)' }}
              />
            </button>
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
            >
              View Store
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
