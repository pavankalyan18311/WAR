'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, ImageIcon, X, Save } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  status: 'Active' | 'Hidden';
  order: number;
}

const INITIAL_COLLECTIONS: Collection[] = [
  { id: 'c1', name: 'Oversized Fits', slug: 'oversized', description: 'Boxy, relaxed silhouettes for the streetwear-forward man.', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=80&h=80&fit=crop', productCount: 18, status: 'Active', order: 1 },
  { id: 'c2', name: 'Classic Essentials', slug: 'classic', description: 'Timeless everyday basics built to last.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop', productCount: 24, status: 'Active', order: 2 },
  { id: 'c3', name: 'Graphic Series', slug: 'graphic', description: 'Bold prints and artistic statements.', image: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=80&h=80&fit=crop', productCount: 12, status: 'Active', order: 3 },
  { id: 'c4', name: 'Premium Collection', slug: 'premium', description: 'Luxe fabrics — Pima cotton, modal blends, and more.', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=80&h=80&fit=crop', productCount: 9, status: 'Active', order: 4 },
  { id: 'c5', name: 'Summer Edit', slug: 'summer', description: 'Light, breathable picks for the hot season.', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=80&h=80&fit=crop', productCount: 7, status: 'Hidden', order: 5 },
];

interface FormState {
  name: string;
  slug: string;
  description: string;
  status: 'Active' | 'Hidden';
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', slug: '', description: '', status: 'Active' });
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditId(null);
    setForm({ name: '', slug: '', description: '', status: 'Active' });
    setShowModal(true);
  };

  const openEdit = (col: Collection) => {
    setEditId(col.id);
    setForm({ name: col.name, slug: col.slug, description: col.description, status: col.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    if (editId) {
      setCollections((prev) =>
        prev.map((c) => c.id === editId ? { ...c, ...form } : c)
      );
    } else {
      const newCol: Collection = {
        id: `c${Date.now()}`,
        ...form,
        image: '',
        productCount: 0,
        order: collections.length + 1,
      };
      setCollections((prev) => [...prev, newCol]);
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this collection? Products won\'t be deleted.')) {
      setCollections((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setCollections((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: c.status === 'Active' ? 'Hidden' : 'Active' } : c)
    );
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Organise products into storefront collections
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <Plus size={16} />
          New Collection
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{collections.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Collections</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
            {collections.filter((c) => c.status === 'Active').length}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Active</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">
            {collections.reduce((sum, c) => sum + c.productCount, 0)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Products</div>
        </div>
      </div>

      {/* Collections grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.sort((a, b) => a.order - b.order).map((col) => (
          <div
            key={col.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: col.status === 'Hidden' ? 0.65 : 1 }}
          >
            {/* Cover image */}
            <div className="relative h-32 overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              {col.image ? (
                <img src={col.image} alt={col.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon size={32} style={{ color: 'var(--fg-muted)' }} />
                </div>
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />

              {/* Drag handle */}
              <button
                className="absolute top-2 left-2 p-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                <GripVertical size={14} />
              </button>

              {/* Status badge */}
              <span
                className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: col.status === 'Active' ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.5)',
                  color: 'white',
                }}
              >
                {col.status}
              </span>

              {/* Name overlay */}
              <div className="absolute bottom-2 left-3 text-white">
                <div className="font-bold text-sm">{col.name}</div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                {col.description || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--fg)' }}>{col.productCount}</span> products
                  &nbsp;·&nbsp;
                  <span>/collections/{col.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => toggleStatus(col.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: col.status === 'Active' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                    color: col.status === 'Active' ? '#eab308' : '#22c55e',
                  }}
                >
                  {col.status === 'Active' ? 'Hide' : 'Activate'}
                </button>
                <button
                  onClick={() => openEdit(col)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(col.id)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={openNew}
          className="rounded-2xl h-64 flex flex-col items-center justify-center gap-3 transition-all"
          style={{
            background: 'var(--bg-subtle)',
            border: '2px dashed var(--border)',
            color: 'var(--fg-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Add Collection</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? 'Edit Collection' : 'New Collection'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--fg-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Collection Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="e.g. Summer Edit"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL Slug</label>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <span className="px-3 py-3 text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)', borderRight: '1px solid var(--border)' }}>
                  /collections/
                </span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="flex-1 px-3 py-3 text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Short description for the collection page…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div className="flex items-center gap-3">
              {(['Active', 'Hidden'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.status === s ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: form.status === s ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-fg)',
                  opacity: !form.name ? 0.5 : 1,
                }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
                ) : (
                  <>
                    <Save size={15} />
                    {editId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
