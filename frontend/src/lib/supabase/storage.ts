import { createClient } from '@/lib/supabase/client';

/**
 * Uploads an image file to Supabase Storage bucket "products"
 * and returns the public URL.
 */
export async function uploadProductImageToStorage(file: File, productId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const sanitizedBaseName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${productId}/${Date.now()}-${sanitizedBaseName}.${fileExt}`;

    const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

console.log('USER:', user);
console.log('USER ERROR:', userError);
console.log('APP METADATA:', user?.app_metadata);
console.log('ROLE:', user?.app_metadata?.role);

    // Upload to Supabase Storage bucket "products"
    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      console.log('UPLOAD DATA:', data);
console.log('UPLOAD ERROR:', error);

    if (error) {
      console.warn('Notice uploading to Supabase Storage bucket "products":', error);
      if (error.message?.includes('row-level security') || (error as any).statusCode === '42501' || (error as any).status === 400) {
        alert(
          'Supabase Storage Policy Notice:\n\n' +
          'Your Supabase Storage bucket "products" has RLS enabled which blocked file upload.\n\n' +
          'Please execute this query in your Supabase SQL Editor:\n\n' +
          'CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = \'products\');\n' +
          'CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = \'products\');'
        );
      }
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('products')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload image to Supabase Storage:', err);
    return null;
  }
}

/**
 * Inserts rows into product_images table linked to product_id
 */
export async function syncProductImagesToDatabase(
  productId: string,
  imageUrls: string[],
  altText: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!imageUrls || imageUrls.length === 0) return true;

    // Clear existing product_images for this product if updating
    await (supabase as any)
      .from('product_images')
      .delete()
      .eq('product_id', productId)
      .catch(() => {});

    const rows = imageUrls.map((url, index) => ({
      product_id: productId,
      url: url,
      alt: altText || 'Product image',
      type: 'image',
      display_order: index,
    }));

    const { error } = await (supabase as any)
      .from('product_images')
      .insert(rows);

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('product_images insert notice:', error.message);
      }
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Inserts rows into product_media or product_images table linked to product_id
 */
export async function syncProductMediaToDatabase(
  productId: string,
  imageUrls: string[],
  altText: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!imageUrls || imageUrls.length === 0) return true;

    const primaryUrl = imageUrls[0];

    // Fail-safe: Update primary image_url on the product row itself
    if (primaryUrl) {
      await (supabase as any)
        .from('products')
        .update({ image_url: primaryUrl })
        .eq('id', productId)
        .catch(() => {});
    }

    // Clean old media records
    await (supabase as any)
      .from('product_media')
      .delete()
      .eq('product_id', productId)
      .catch(() => {});

    const rows = imageUrls.map((url, index) => ({
      product_id: productId,
      storage_path: url,
      media_type: 'image',
      alt_text: altText || 'Product image',
      sort_order: index,
    }));

    const { error } = await (supabase as any)
      .from('product_media')
      .insert(rows);

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('product_media insert notice:', error.message);
      }
      // Try fallback to product_images only if table exists
      await syncProductImagesToDatabase(productId, imageUrls, altText);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Failed to sync product_media to database:', err);
    return false;
  }
}

