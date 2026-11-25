import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { orderReference } from '@/lib/checkout/client';
import { formatPrice } from '@/lib/utils';
import { siteConfig } from '@/lib/siteConfig';
import { maskPhone } from '@/lib/maskPhone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * GET /api/shipping/dev-label/[shipmentId] — DEVELOPMENT ONLY (admin).
 * A printable sample 4×6 shipping label so the full flow can be tried without a Shiprocket account.
 * In production the real label comes from Shiprocket.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ shipmentId: string }> }) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { shipmentId } = await params;
  const supabase = getServiceClient();
  const [{ data: order }, { data: settings }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(quantity, status, product:products(name), variant:product_variants(sku))')
      .eq('shiprocket_shipment_id', shipmentId)
      .maybeSingle(),
    supabase.from('store_settings').select('shiprocket_pickup_location, parcel_weight_kg').eq('id', 1).maybeSingle(),
  ]);
  if (!order) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

  const a = order.shipping_address ?? {};
  const items = (order.order_items ?? []).filter((it: any) => it.status !== 'cancelled');
  const units = items.reduce((n: number, it: any) => n + Number(it.quantity), 0);
  const weight = (Number(settings?.parcel_weight_kg ?? 0.3) * Math.max(1, units)).toFixed(2);
  const cod = order.payment_method === 'cod';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(order.tracking_number)}</title>
<style>
  @page { size: 4in 6in; margin: 0; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #eee; }
  .label { width: 4in; height: 6in; box-sizing: border-box; margin: 16px auto; background: #fff; border: 2px solid #000; padding: 10px; display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
  .row { border-bottom: 1px dashed #000; padding-bottom: 8px; }
  .big { font-size: 20px; font-weight: bold; }
  .awb { font-family: 'Courier New', monospace; font-size: 22px; letter-spacing: 2px; text-align: center; border: 2px solid #000; padding: 6px; }
  .bars { height: 46px; background: repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 4px,#000 4px 7px,#fff 7px 8px); }
  .pay { font-size: 18px; font-weight: bold; text-align: center; padding: 6px; border: 2px solid #000; }
  .test { text-align: center; font-weight: bold; color: #b00; letter-spacing: 3px; }
  .muted { color: #444; }
  .print { display: block; margin: 0 auto 16px; padding: 10px 18px; font-size: 14px; cursor: pointer; }
  @media print { body { background: #fff; } .label { margin: 0; } .print { display: none; } }
</style></head><body>
<div class="label">
  <div class="test">TEST LABEL — NOT FOR SHIPPING</div>
  <div class="row"><div class="muted">Courier</div><div class="big">${esc(order.courier_name || 'Courier')}</div></div>
  <div class="bars"></div>
  <div class="awb">${esc(order.tracking_number || 'AWB pending')}</div>
  <div class="row"><div class="muted">SHIP TO</div>
    <div class="big">${esc(a.full_name)}</div>
    <div>${esc(a.address_line_1)}${a.address_line_2 ? `, ${esc(a.address_line_2)}` : ''}</div>
    <div>${esc(a.city)}, ${esc(a.state)} — <b>${esc(a.pincode)}</b></div>
    <div>Phone: ${esc(maskPhone(a.phone))}</div>
  </div>
  <div class="pay">${cod ? `COD — COLLECT ${esc(formatPrice(Number(order.total)))}` : 'PREPAID — DO NOT COLLECT'}</div>
  <div class="row"><div class="muted">Order</div><div><b>${esc(orderReference(order.id))}</b> · ${units} item${units === 1 ? '' : 's'} · ${weight} kg</div>
    <div class="muted">${items.map((it: any) => `${esc(it.product?.name)} ×${esc(it.quantity)}`).join(', ')}</div></div>
  <div><div class="muted">FROM (pickup: ${esc(settings?.shiprocket_pickup_location || 'Primary')})</div><div><b>WAR — Without Any Regrets</b></div>${siteConfig.address ? `<div>${esc(siteConfig.address)}</div>` : ''}</div>
</div>
<button class="print" onclick="window.print()">Print label</button>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
