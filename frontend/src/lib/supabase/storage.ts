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
      .eq('product_id', productId);

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
      console.error('Error inserting into product_images table:', error);
      if (error.code === '42501') {
        alert(
          'Supabase Row-Level Security (RLS) Notice:\n\n' +
          'Your table "public.product_images" blocked the image insert.\n\n' +
          'Please execute this query in your Supabase SQL Editor:\n\n' +
          'ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;\n' +
          'ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;'
        );
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to sync product images to database:', err);
    return false;
  }
}
