'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAdminStore } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
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
  const [roleChecked, setRoleChecked] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Supabase Role Verification Guard
  useEffect(() => {
    if (!mounted) return;
    const checkSupabaseRole = async () => {
      if (pathname === '/admin/login' || pathname === '/auth/login') {
        setRoleChecked(true);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userMeta = user.user_metadata || {};
          const appMeta = user.app_metadata || {};

          let profileRole = '';
          try {
            const { data: profiles } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', user.id);
            if (profiles && profiles.length > 0) profileRole = profiles[0]?.role || '';
          } catch (pErr) {
            // Ignore
          }

          const role = (profileRole || appMeta.role || userMeta.role || '').toLowerCase();
          
          if (userEmail === 'maladoddipavankalyan@gmail.com' || ['admin', 'super_admin', 'manager'].includes(role)) {
            setIsDenied(false);
            setRoleChecked(true);
            return;
          } else if (role === 'customer') {
            setIsDenied(true);
            setRoleChecked(true);
            return;
          }
        }
      } catch (err) {
        console.error('Role check error:', err);
      }

      // If store is authenticated (mock or persistent), allow
      if (isAuthenticated) {
        setIsDenied(false);
      } else {
        router.push('/auth/login');
      }
      setRoleChecked(true);
    };

    checkSupabaseRole();
  }, [mounted, isAuthenticated, pathname, router]);

  // Don't wrap login page
  if (pathname === '/admin/login' || pathname === '/auth/login') {
    return <>{children}</>;
  }

  if (!mounted || !roleChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Access Denied screen for non-admin Supabase users
  if (isDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 text-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-md w-full rounded-2xl p-8 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2">Access Denied (Admin Role Required)</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
            Your logged-in Supabase account does not have admin privileges. Update your <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--accent)' }}>role</code> column in the Supabase <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--accent)' }}>public.profiles</code> table to <strong className="text-white">&apos;admin&apos;</strong> to unlock access.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/admin/login"
              onClick={() => { setIsDenied(false); logout(); }}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              Sign In With Admin Account
            </Link>
            <Link
              href="/"
              className="w-full py-3 rounded-xl font-semibold text-xs"
              style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !roleChecked) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await useAuthStore.getState().logout();
    } catch (err) {
      // ignore
    }
    logout();
    router.push('/auth/login');
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
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm tracking-wider"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              WAR
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">WAR ADMIN</div>
              <div className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                <ShieldCheck size={10} />
                Management Suite
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
          {(() => {
            const user = useAuthStore.getState().user;
            const authRole = useAuthStore.getState().role;
            const meta = user?.user_metadata || {};
            const displayName = meta.first_name || meta.name
              ? `${meta.first_name || meta.name} ${meta.last_name || ''}`.trim()
              : admin?.name || (user?.email ? user.email.split('@')[0] : 'Pavan Kalyan');
            
            const displayRole = (user?.email || '').toLowerCase().trim() === 'maladoddipavankalyan@gmail.com'
              ? 'Super Admin'
              : admin?.role
                ? admin.role.replace('_', ' ')
                : authRole || 'Admin';
            
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <div
                className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase tracking-wider"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate capitalize">{displayName}</div>
                  <div className="text-xs capitalize font-medium" style={{ color: 'var(--accent)' }}>
                    {displayRole}
                  </div>
                </div>
              </div>
            );
          })()}
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
