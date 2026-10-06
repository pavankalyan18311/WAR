'use client';

import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
  role: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      const json = await res.json();
      setCustomers(json.customers ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalSpentAll = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const avgOrders = customers.length > 0
    ? (customers.reduce((sum, c) => sum + c.orders_count, 0) / customers.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Manage registered user accounts & customer insights
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="p-2 rounded-xl transition-all"
          style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{customers.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Customers</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>₹{totalSpentAll.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Customer Lifetime Value</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{avgOrders}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Avg. Orders per Customer</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone number…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--fg-muted)' }}>
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading customers…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Orders</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--fg-muted)' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{search ? 'No customers match your search' : 'No customers yet'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr
                    key={`${c.id}-${idx}`}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{c.phone}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {c.orders_count} {c.orders_count === 1 ? 'order' : 'orders'}
                    </td>
                    <td className="px-4 py-3.5 font-bold" style={{ color: '#22c55e' }}>
                      ₹{c.total_spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: c.role.includes('admin') || c.role.includes('manager') ? 'rgba(59,130,246,0.12)' : 'var(--bg-subtle)',
                          color: c.role.includes('admin') || c.role.includes('manager') ? '#3b82f6' : 'var(--fg-muted)',
                        }}>
                        {c.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs hidden lg:table-cell" style={{ color: 'var(--fg-muted)' }}>
                      {c.created_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
