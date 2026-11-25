-- ============================================================================
-- WAR — Shiprocket booking settings + shipment details on orders (2026-10-13)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- Admin → Settings → Shiprocket
alter table public.store_settings add column if not exists shiprocket_pickup_location text not null default 'Primary';
alter table public.store_settings add column if not exists parcel_weight_kg  numeric(6,3) not null default 0.3 check (parcel_weight_kg > 0 and parcel_weight_kg <= 50);
alter table public.store_settings add column if not exists parcel_length_cm  numeric(6,1) not null default 30  check (parcel_length_cm > 0 and parcel_length_cm <= 200);
alter table public.store_settings add column if not exists parcel_breadth_cm numeric(6,1) not null default 25  check (parcel_breadth_cm > 0 and parcel_breadth_cm <= 200);
alter table public.store_settings add column if not exists parcel_height_cm  numeric(6,1) not null default 3   check (parcel_height_cm > 0 and parcel_height_cm <= 200);
alter table public.store_settings add column if not exists shiprocket_auto_assign boolean not null default true;

-- What happened with each order's shipment (shown in Admin → Orders)
alter table public.orders add column if not exists shiprocket_order_id    text;
alter table public.orders add column if not exists shiprocket_shipment_id text;
alter table public.orders add column if not exists courier_name           text;
alter table public.orders add column if not exists shipping_label_url     text;
alter table public.orders add column if not exists shipping_error         text;

notify pgrst, 'reload schema';
