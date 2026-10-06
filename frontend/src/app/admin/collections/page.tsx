'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, ImageIcon, X, Save, RefreshCw } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', image_url: '', is_active: true };

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/collections');
      const json = await res.json();
      setCollections(json.collections ?? []);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (col: Collection) => {
    setEditId(col.id);
    setForm({
      name: col.name,
      slug: col.slug,
      description: col.description || '',
      image_url: col.image_url || '',
      is_active: col.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };

      const url = editId ? `/api/admin/collections/${editId}` : '/api/admin/collections';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save collection');
        return;
      }
      setShowModal(false);
      await fetchCollections();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete collection');
    }
  };

  const toggleStatus = async (col: Collection) => {
    try {
      const res = await fetch(`/api/admin/collections/${col.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !col.is_active }),
      });
      if (res.ok) {
        setCollections((prev) => prev.map((c) => c.id === col.id ? { ...c, is_active: !col.is_active } : c));
      }
    } catch {
      alert('Failed to update status');
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCollections}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <Plus size={16} />
            New Collection
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{collections.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Collections</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
            {collections.filter((c) => c.is_active).length}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Active</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--fg-muted)' }}>
            {collections.filter((c) => !c.is_active).length}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Hidden</div>
        </div>
      </div>

      {/* Collections grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--fg-muted)' }}>
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading collections…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.sort((a, b) => a.display_order - b.display_order).map((col) => (
            <div
              key={col.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: col.is_active ? 1 : 0.65 }}
            >
              {/* Cover image */}
              <div className="relative h-32 overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                {col.image_url ? (
                  <img src={col.image_url} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon size={32} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                <button
                  className="absolute top-2 left-2 p-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                >
                  <GripVertical size={14} />
                </button>
                <span
                  className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: col.is_active ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.5)',
                    color: 'white',
                  }}
                >
                  {col.is_active ? 'Active' : 'Hidden'}
                </span>
                <div className="absolute bottom-2 left-3 text-white">
                  <div className="font-bold text-sm">{col.name}</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                  {col.description || 'No description'}
                </p>
                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  /collections/{col.slug}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => toggleStatus(col)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: col.is_active ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                      color: col.is_active ? '#eab308' : '#22c55e',
                    }}
                  >
                    {col.is_active ? 'Hide' : 'Activate'}
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
      )}

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

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                {error}
              </div>
            )}

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

            <div>
              <label className="block text-sm font-medium mb-2">Cover Image URL</label>
              <input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                type="url"
                placeholder="https://…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div className="flex items-center gap-3">
              {([true, false] as const).map((active) => (
                <button
                  key={String(active)}
                  onClick={() => setForm((f) => ({ ...f, is_active: active }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.is_active === active ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: form.is_active === active ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  {active ? 'Active' : 'Hidden'}
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
                disabled={saving || !form.name.trim() || !form.slug.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-fg)',
                  opacity: (!form.name.trim() || !form.slug.trim()) ? 0.5 : 1,
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
