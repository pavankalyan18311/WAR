import { createClient } from '@/lib/supabase/client';

export interface ColorRecord {
  id: string;
  name: string;
  color_code?: string | null;
}

export interface SizeRecord {
  id: string;
  name: string;
  sort_order: number;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
}

/**
 * Get existing category or insert a new one by name/slug
 */
export async function getOrCreateCategory(categoryName: string): Promise<CategoryRecord | null> {
  const supabase = createClient();
  if (!categoryName || !categoryName.trim()) return null;

  const cleanName = categoryName.trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  try {
    // 1. Check existing
    const { data: existing } = await (supabase as any)
      .from('categories')
      .select('*')
      .or(`slug.eq.${slug},name.ilike.${cleanName}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // 2. Insert new
    const { data: created, error } = await (supabase as any)
      .from('categories')
      .insert([{ name: cleanName, slug: slug }])
      .select();

    if (created && created.length > 0) {
      return created[0];
    }

    if (error) {
      console.warn('Failed to insert category:', error);
    }
  } catch (err) {
    console.error('Category resolution error:', err);
  }
  return null;
}

/**
 * Link product to category in product_categories junction table
 */
export async function linkProductCategory(productId: string, categoryId: string): Promise<boolean> {
  const supabase = createClient();
  try {
    await (supabase as any)
      .from('product_categories')
      .delete()
      .eq('product_id', productId);

    const { error } = await (supabase as any)
      .from('product_categories')
      .insert([{ product_id: productId, category_id: categoryId }]);

    if (error) {
      console.warn('Error in product_categories link:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed linking product_categories:', err);
    return false;
  }
}

/**
 * Get existing color or insert a new one
 */
export async function getOrCreateColor(colorName: string, colorHex?: string): Promise<ColorRecord | null> {
  const supabase = createClient();
  if (!colorName || !colorName.trim()) return null;

  const cleanName = colorName.trim();
  try {
    const { data: existing } = await (supabase as any)
      .from('colors')
      .select('*')
      .ilike('name', cleanName)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const { data: created, error } = await (supabase as any)
      .from('colors')
      .insert([{ name: cleanName, color_code: colorHex || null }])
      .select();

    if (created && created.length > 0) {
      return created[0];
    }

    if (error) {
      console.warn('Failed to insert color:', error);
    }
  } catch (err) {
    console.error('Color resolution error:', err);
  }
  return null;
}

/**
 * Get existing size option or insert a new one
 */
export async function getOrCreateSize(sizeName: string, sortOrder: number = 0): Promise<SizeRecord | null> {
  const supabase = createClient();
  if (!sizeName || !sizeName.trim()) return null;

  const cleanName = sizeName.trim().toUpperCase();
  try {
    const { data: existing } = await (supabase as any)
      .from('size_options')
      .select('*')
      .ilike('name', cleanName)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const { data: created, error } = await (supabase as any)
      .from('size_options')
      .insert([{ name: cleanName, sort_order: sortOrder }])
      .select();

    if (created && created.length > 0) {
      return created[0];
    }

    if (error) {
      console.warn('Failed to insert size_option:', error);
    }
  } catch (err) {
    console.error('Size option resolution error:', err);
  }
  return null;
}

/**
 * Save Variants and associated Inventory records
 */
export async function saveProductVariantsAndInventory(
  productId: string,
  baseSku: string,
  price: number,
  compareAtPrice: number | null,
  selectedColors: { name: string; hex?: string }[],
  selectedSizes: string[],
  stockMap: Record<string, number>
): Promise<boolean> {
  const supabase = createClient();
  try {
    const colors = selectedColors.length > 0 ? selectedColors : [{ name: 'Default', hex: '#000000' }];
    const sizes = selectedSizes.length > 0 ? selectedSizes : ['M', 'L', 'XL'];

    for (const col of colors) {
      const colorRec = await getOrCreateColor(col.name, col.hex);

      for (let idx = 0; idx < sizes.length; idx++) {
        const sz = sizes[idx];
        const sizeRec = await getOrCreateSize(sz, idx);

        const skuVal = `${baseSku}-${col.name.slice(0, 3).toUpperCase()}-${sz.toUpperCase()}`;
        const stockQty = stockMap[sz] !== undefined ? stockMap[sz] : (stockMap['default'] ?? 25);

        // 1. Upsert product_variant on SKU conflict
        const variantPayload: any = {
          product_id: productId,
          sku: skuVal,
          color: col.name,
          color_hex: col.hex || '#000000',
          size: sz,
          price: price,
          compare_at_price: compareAtPrice,
          status: 'active',
        };

        if (colorRec?.id) variantPayload.color_id = colorRec.id;
        if (sizeRec?.id) variantPayload.size_option_id = sizeRec.id;

        let variantId: string | null = null;

        // Try upsert first
        const { data: variantData, error: variantErr } = await (supabase as any)
          .from('product_variants')
          .upsert([variantPayload], { onConflict: 'sku' })
          .select();

        if (variantData && variantData.length > 0) {
          variantId = variantData[0].id;
        } else if (variantErr) {
          // Fallback: fetch existing variant by SKU or product_id/color/size
          const { data: existingVariant } = await (supabase as any)
            .from('product_variants')
            .select('id')
            .eq('sku', skuVal)
            .limit(1);

          if (existingVariant && existingVariant.length > 0) {
            variantId = existingVariant[0].id;
          }
        }

        if (variantId) {
          // 2. Insert or update inventory
          await (supabase as any)
            .from('inventory')
            .upsert(
              [{ variant_id: variantId, quantity: stockQty, reserved_quantity: 0 }],
              { onConflict: 'variant_id' }
            )
            .catch(() => {});
        }
      }
    }
    return true;
  } catch (err) {
    console.error('Failed saving variants and inventory:', err);
    return false;
  }
}
