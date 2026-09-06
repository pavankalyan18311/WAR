-- ============================================================
-- ThreadX — Fashion E-Commerce Seed Products Data
-- Copy & Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure Categories & Sub-Categories exist
INSERT INTO public.categories (id, name, slug, description, display_order, is_active) VALUES
  (1, 'Men', 'men', 'Premium menswear featuring streetwear, casuals, and oversized fits.', 1, true),
  (2, 'Women', 'women', 'Contemporary women fashion & elevated aesthetic wardrobe staples.', 2, true),
  (3, 'Unisex', 'unisex', 'Versatile gender-neutral designs and signature drop-shoulder tees.', 3, true),
  (4, 'Kids', 'kids', 'Comfortable, durable, and stylish clothing for kids.', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 2. Seed Products
-- Delete existing seed demo items if needed (optional)
-- DELETE FROM public.products WHERE sku LIKE 'TX-%';

INSERT INTO public.products (
  id, sku, name, slug, description, price, discount_price, category_id, status, fabric, fit_type, tags, is_featured, rating, review_count
) VALUES
  (
    'a1b2c3d4-0001-4000-8000-000000000001',
    'TX-TSH-001',
    'Heavyweight Heavy-Cotton Oversized Tee',
    'heavyweight-oversized-tee-black',
    'Crafted from 280 GSM 100% combed organic cotton. Features drop-shoulder design, ribbed collar, and reinforced double-needle stitching. Pre-shrunk for lasting shape.',
    1499.00,
    899.00, -- 40% OFF
    1,
    'active',
    '280 GSM Organic Cotton',
    'oversized',
    ARRAY['oversized', 'streetwear', 'best-seller', 'topwear'],
    true,
    4.7,
    142
  ),
  (
    'a1b2c3d4-0002-4000-8000-000000000002',
    'TX-TSH-002',
    'Acid Wash Vintage Drop-Shoulder Shirt',
    'acid-wash-vintage-drop-shoulder',
    'Artisanal hand-dyed acid wash texture giving every piece a unique vintage patina. Ultra-breathable, soft-hand feel with relaxed casual fit.',
    1999.00,
    1199.00, -- 40% OFF
    1,
    'active',
    '100% French Terry Cotton',
    'relaxed',
    ARRAY['vintage', 'acid-wash', 'trending'],
    true,
    4.8,
    98
  ),
  (
    'a1b2c3d4-0003-4000-8000-000000000003',
    'TX-SHI-003',
    'Resort Linen-Blend Cuban Collar Shirt',
    'resort-linen-cuban-collar-shirt',
    'Breezy, lightweight linen-cotton blend with breathable weave. Relaxed open Cuban collar design ideal for summer resortwear and weekend outings.',
    2499.00,
    1499.00, -- 40% OFF
    1,
    'active',
    'Linen Cotton Blend',
    'regular',
    ARRAY['linen', 'summer', 'cuban-collar', 'shirts'],
    true,
    4.6,
    76
  ),
  (
    'a1b2c3d4-0004-4000-8000-000000000004',
    'TX-JNS-004',
    'Wide Leg Baggy Raw Denim Jeans',
    'wide-leg-baggy-raw-denim-jeans',
    'Classic 14oz non-stretch Japanese selvedge-inspired raw denim. Wide-leg silhouette with deep utility pockets and branded metal button closure.',
    3499.00,
    2099.00, -- 40% OFF
    1,
    'active',
    '14oz Heavyweight Denim',
    'relaxed',
    ARRAY['denim', 'baggy', 'bottomwear'],
    true,
    4.9,
    215
  ),
  (
    'a1b2c3d4-0005-4000-8000-000000000005',
    'TX-HD-005',
    'Minimalist Fleece Heavyweight Hoodie',
    'minimalist-fleece-heavyweight-hoodie',
    '400 GSM brushed fleece lining delivering maximum warmth and plush comfort. Double-lined hood, seamless kangaroo pocket, and ribbed cuffs.',
    3999.00,
    2399.00, -- 40% OFF
    3,
    'active',
    '400 GSM Fleece Cotton',
    'oversized',
    ARRAY['hoodie', 'winterwear', 'fleece', 'unisex'],
    true,
    4.8,
    184
  ),
  (
    'a1b2c3d4-0006-4000-8000-000000000006',
    'TX-W-DRS-006',
    'Ribbed Knit Bodycon Midi Dress',
    'ribbed-knit-bodycon-midi-dress',
    'Form-fitting ribbed stretch knit dress featuring a clean crew neckline and side slit for effortless chic elegance.',
    2799.00,
    1679.00, -- 40% OFF
    2,
    'active',
    'Viscose Modal Rib Knit',
    'slim',
    ARRAY['dress', 'women', 'knitwear'],
    false,
    4.5,
    63
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  discount_price = EXCLUDED.discount_price,
  description = EXCLUDED.description,
  fabric = EXCLUDED.fabric,
  fit_type = EXCLUDED.fit_type,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count;

-- 3. Seed Product Images
DELETE FROM public.product_images WHERE product_id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0004-4000-8000-000000000004',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'a1b2c3d4-0006-4000-8000-000000000006'
);

INSERT INTO public.product_images (product_id, url, alt, display_order) VALUES
  -- Tee 1
  ('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop', 'Heavyweight Black Oversized Tee Front', 1),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000&auto=format&fit=crop', 'Heavyweight Black Oversized Tee Back', 2),
  
  -- Tee 2
  ('a1b2c3d4-0002-4000-8000-000000000002', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1000&auto=format&fit=crop', 'Acid Wash Vintage Tee', 1),

  -- Shirt 3
  ('a1b2c3d4-0003-4000-8000-000000000003', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1000&auto=format&fit=crop', 'Linen Cuban Collar Shirt', 1),

  -- Jeans 4
  ('a1b2c3d4-0004-4000-8000-000000000004', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop', 'Wide Leg Baggy Denim', 1),

  -- Hoodie 5
  ('a1b2c3d4-0005-4000-8000-000000000005', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop', 'Minimalist Fleece Hoodie', 1),

  -- Dress 6
  ('a1b2c3d4-0006-4000-8000-000000000006', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop', 'Ribbed Knit Midi Dress', 1);

-- 4. Seed Product Variants (Colors & Sizes)
DELETE FROM public.product_variants WHERE product_id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0004-4000-8000-000000000004',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'a1b2c3d4-0006-4000-8000-000000000006'
);

INSERT INTO public.product_variants (product_id, sku, color, color_hex, size, stock_quantity) VALUES
  -- Tee 1 Variants
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-S', 'Pitch Black', '#0D0D0D', 'S', 25),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-M', 'Pitch Black', '#0D0D0D', 'M', 40),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-L', 'Pitch Black', '#0D0D0D', 'L', 35),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-XL', 'Pitch Black', '#0D0D0D', 'XL', 15),

  -- Tee 2 Variants
  ('a1b2c3d4-0002-4000-8000-000000000002', 'TX-TSH-002-WSH-M', 'Washed Charcoal', '#333333', 'M', 30),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'TX-TSH-002-WSH-L', 'Washed Charcoal', '#333333', 'L', 20),

  -- Shirt 3 Variants
  ('a1b2c3d4-0003-4000-8000-000000000003', 'TX-SHI-003-SND-M', 'Desert Sand', '#D2B48C', 'M', 20),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'TX-SHI-003-SND-L', 'Desert Sand', '#D2B48C', 'L', 25),

  -- Jeans 4 Variants
  ('a1b2c3d4-0004-4000-8000-000000000004', 'TX-JNS-004-IND-30', 'Raw Indigo', '#1A2B4C', 'M', 18),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'TX-JNS-004-IND-32', 'Raw Indigo', '#1A2B4C', 'L', 22),

  -- Hoodie 5 Variants
  ('a1b2c3d4-0005-4000-8000-000000000005', 'TX-HD-005-GRY-M', 'Heather Grey', '#808080', 'M', 30),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'TX-HD-005-GRY-L', 'Heather Grey', '#808080', 'L', 25);
