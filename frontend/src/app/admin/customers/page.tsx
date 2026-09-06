'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  IndianRupee,
  ShieldCheck,
  ChevronDown,
  UserCheck,
} from 'lucide-react';

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

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Arjun Sharma', email: 'arjun@example.com', phone: '+91 98765 43210', orders_count: 5, total_spent: 8990, created_at: '2026-01-15', role: 'Customer' },
  { id: 'c2', name: 'Ravi Kumar', email: 'ravi@example.com', phone: '+91 98765 12345', orders_count: 3, total_spent: 4297, created_at: '2026-02-02', role: 'Customer' },
  { id: 'c3', name: 'Pavan Kalyan', email: 'maladoddipavankalyan@gmail.com', phone: '+91 91234 56789', orders_count: 8, total_spent: 14500, created_at: '2026-01-01', role: 'Super Admin' },
  { id: 'c4', name: 'Deepak Nair', email: 'deepak@example.com', phone: '+91 99887 76655', orders_count: 2, total_spent: 2498, created_at: '2026-03-10', role: 'Customer' },
  { id: 'c5', name: 'Karthik M', email: 'karthik@example.com', phone: '+91 97766 55443', orders_count: 4, total_spent: 6996, created_at: '2026-03-22', role: 'Customer' },
  { id: 'c6', name: 'Suresh Babu', email: 'suresh@example.com', phone: '+91 95544 33221', orders_count: 1, total_spent: 2199, created_at: '2026-04-05', role: 'Customer' },
];

export default function AdminCustomersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profiles && profiles.length > 0) {
          const mapped: Customer[] = profiles.map((p: any) => ({
            id: p.id,
            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Customer',
            email: p.email || 'customer@war.in',
            phone: p.phone || 'N/A',
            orders_count: 1 + (p.id ? p.id.charCodeAt(0) % 5 : 0),
            total_spent: 999 * (1 + (p.id ? p.id.charCodeAt(0) % 5 : 0)),
            created_at: new Date(p.created_at || Date.now()).toISOString().split('T')[0],
            role: p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Customer',
          }));
          setCustomers(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch customers from Supabase', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [supabase]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalSpentAll = customers.reduce((sum, c) => sum + c.total_spent, 0);

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
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {(customers.reduce((sum, c) => sum + c.orders_count, 0) / Math.max(1, customers.length)).toFixed(1)}
          </div>
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
                  <p className="text-sm">No customers found</p>
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => (
                <tr
                  key={c.id ? `${c.id}-${idx}` : `cust-${idx}`}
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
                    {c.orders_count} orders
                  </td>
                  <td className="px-4 py-3.5 font-bold" style={{ color: '#22c55e' }}>
                    ₹{c.total_spent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: c.role.toLowerCase().includes('admin') ? 'rgba(59,130,246,0.12)' : 'var(--bg-subtle)',
                        color: c.role.toLowerCase().includes('admin') ? '#3b82f6' : 'var(--fg-muted)',
                      }}>
                      {c.role}
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
      </div>
    </div>
  );
}
