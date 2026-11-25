'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ProductForm, { type ProductFormValues } from '@/components/admin/ProductForm';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductFormValues | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/products/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load product.');
        setProduct(data.product);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error}</p>
        <Link href="/admin/products" className="text-sm underline">Back to products</Link>
      </div>
    );
  }
  if (!product) return <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Loading product…</p>;
  return <ProductForm productId={id} initial={product} />;
}
