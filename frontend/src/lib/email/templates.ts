import { formatPrice } from '@/lib/utils';
import { orderReference } from '@/lib/checkout/client';
import { siteConfig } from '@/lib/siteConfig';
import { DEFAULT_RETURN_DAYS } from '@/lib/checkout/storeSettings';

export interface OrderEmailItem {
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  slug?: string | null;
}

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  address: Record<string, any>;
  siteUrl: string;
  /** Reward points earned on this order (delivered email). */
  pointsEarned?: number | null;
  /** Return / exchange window from Admin → Settings (defaults to 7). */
  returnDays?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const INK = '#161412';
const MUTED = '#5B554D';
const RULE = '#D9D3C8';
const ACCENT = '#7A1F1F';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const firstName = (name: string) => (name || '').trim().split(/\s+/)[0] || 'there';
const itemLine = (it: OrderEmailItem) => [it.size && `Size ${it.size}`, it.color, `Qty ${it.quantity}`].filter(Boolean).join(' · ');
const paymentLabel = (m: string) => (m === 'cod' ? 'Cash on delivery' : 'Paid online');

/** Shared editorial frame: paper background, serif wordmark, quiet footer. */
function layout(opts: { preheader: string; eyebrow: string; heading: string; body: string; siteUrl: string }): string {
  const support = siteConfig.supportEmail
    ? `Questions? Write to <a href="mailto:${esc(siteConfig.supportEmail)}" style="color:${INK}">${esc(siteConfig.supportEmail)}</a> or just reply to this email.`
    : 'Questions? Just reply to this email.';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F5F2EC">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF9F5;border:1px solid ${RULE}">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${RULE}">
  <a href="${esc(opts.siteUrl)}" style="text-decoration:none;color:${INK};font-family:${SERIF};font-size:26px">WAR</a>
  <div style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${MUTED};margin-top:2px">Without Any Regrets</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${MUTED}">${esc(opts.eyebrow)}</div>
  <h1 style="font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.15;color:${INK};margin:10px 0 20px">${opts.heading}</h1>
  <div style="font-family:${SANS};font-size:15px;line-height:1.6;color:${INK}">${opts.body}</div>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED}">
  ${support}<br>&copy; ${new Date().getFullYear()} ${esc(siteConfig.legalName || 'WAR — Without Any Regrets')}
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${INK};color:#F5F2EC;text-decoration:none;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:14px 26px">${esc(label)}</a>`;

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items.map((it) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK}">
      ${esc(it.name)}<div style="font-size:12px;color:${MUTED};margin-top:2px">${esc(itemLine(it))}</div>
    </td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK};white-space:nowrap">${formatPrice(it.unitPrice * it.quantity)}</td>
  </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${INK};margin:8px 0 4px">${rows}</table>`;
}

function totalsTable(o: OrderEmailData): string {
  const row = (label: string, value: string, strong = false) => `<tr>
    <td style="padding:4px 0;font-family:${SANS};font-size:${strong ? 16 : 14}px;color:${strong ? INK : MUTED};${strong ? 'font-weight:600' : ''}">${label}</td>
    <td align="right" style="padding:4px 0;font-family:${SANS};font-size:${strong ? 16 : 14}px;color:${INK};${strong ? 'font-weight:600' : ''}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px">
    ${row('Subtotal', formatPrice(o.subtotal))}
    ${o.discount > 0 ? row('Discount', `−${formatPrice(o.discount)}`) : ''}
    ${row('Shipping', o.shipping > 0 ? formatPrice(o.shipping) : 'Free')}
    ${row('Total', formatPrice(o.total), true)}
  </table>`;
}

function addressBlock(a: Record<string, any>): string {
  const lines = [a.full_name, a.address_line_1, a.address_line_2, [a.city, a.state].filter(Boolean).join(', '), a.pincode, a.phone].filter(Boolean);
  return lines.map(esc).join('<br>');
}

const orderUrl = (o: OrderEmailData) => `${o.siteUrl}/account/orders/${o.orderId}`;
const reviewUrl = (o: OrderEmailData, it: OrderEmailItem) => `${o.siteUrl}/products/${it.slug}?review=1#reviews`;

export function orderPlacedEmail(o: OrderEmailData): RenderedEmail {
  const ref = orderReference(o.orderId);
  const body = `
    <p style="margin:0 0 16px">Hi ${esc(firstName(o.customerName))}, thank you for your order. We&rsquo;re getting it ready and will email you the tracking details as soon as it ships.</p>
    <p style="margin:0 0 8px;font-size:13px;color:${MUTED}">Order <strong style="color:${INK}">${ref}</strong> · ${paymentLabel(o.paymentMethod)}</p>
    ${itemsTable(o.items)}
    ${totalsTable(o)}
    <div style="font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${MUTED};margin-bottom:6px">Shipping to</div>
    <p style="margin:0 0 28px;font-size:14px;color:${INK}">${addressBlock(o.address)}</p>
    ${button(orderUrl(o), 'View your order')}
    <p style="margin:24px 0 0;font-size:13px;color:${MUTED}">${o.returnDays ?? DEFAULT_RETURN_DAYS}-day returns &amp; size exchange on every order.</p>`;
  const text = [
    `Hi ${firstName(o.customerName)}, thank you for your order ${ref}.`,
    '',
    ...o.items.map((it) => `- ${it.name} (${itemLine(it)}) ${formatPrice(it.unitPrice * it.quantity)}`),
    '',
    `Subtotal: ${formatPrice(o.subtotal)}`,
    ...(o.discount > 0 ? [`Discount: -${formatPrice(o.discount)}`] : []),
    `Shipping: ${o.shipping > 0 ? formatPrice(o.shipping) : 'Free'}`,
    `Total: ${formatPrice(o.total)} (${paymentLabel(o.paymentMethod)})`,
    '',
    `View your order: ${orderUrl(o)}`,
  ].join('\n');
  return {
    subject: `Order confirmed — ${ref}`,
    html: layout({ preheader: `We've received your order ${ref}.`, eyebrow: 'Order confirmed', heading: 'Thank you — your order is in.', body, siteUrl: o.siteUrl }),
    text,
  };
}

export function orderDeliveredEmail(o: OrderEmailData): RenderedEmail {
  const ref = orderReference(o.orderId);
  const reviewable = o.items.filter((it) => it.slug);
  const points = Number(o.pointsEarned ?? 0);
  const reviewRows = reviewable.map((it) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK}">${esc(it.name)}</td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid ${RULE}"><a href="${esc(reviewUrl(o, it))}" style="font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ACCENT}">Write a review</a></td>
  </tr>`).join('');
  const body = `
    <p style="margin:0 0 16px">Hi ${esc(firstName(o.customerName))}, your order <strong>${ref}</strong> has been delivered. We hope it fits just right.</p>
    ${points > 0 ? `<p style="margin:0 0 20px;padding:14px 16px;border:1px solid ${RULE};background:#F5F2EC">You earned <strong style="color:${ACCENT}">${points} reward points</strong> (worth ₹${points}) on this order. Use them on your next order within 90 days.</p>` : ''}
    ${reviewable.length ? `<p style="margin:0 0 8px">How did we do? A quick rating helps other customers pick the right fit.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${INK};margin:8px 0 28px">${reviewRows}</table>` : ''}
    <p style="margin:0 0 24px;font-size:14px;color:${MUTED}">Not the right size? You can request a return or size exchange within ${o.returnDays ?? DEFAULT_RETURN_DAYS} days of delivery.</p>
    ${button(orderUrl(o), 'View your order')}`;
  const text = [
    `Hi ${firstName(o.customerName)}, your order ${ref} has been delivered.`,
    ...(points > 0 ? [`You earned ${points} reward points (worth ₹${points}). Use them within 90 days.`] : []),
    '',
    ...(reviewable.length ? ['Tell us what you think:', ...reviewable.map((it) => `- ${it.name}: ${reviewUrl(o, it)}`), ''] : []),
    `Return or exchange within ${o.returnDays ?? DEFAULT_RETURN_DAYS} days: ${orderUrl(o)}`,
  ].join('\n');
  return {
    subject: `Delivered — ${ref}`,
    html: layout({ preheader: 'Your WAR order has arrived.', eyebrow: 'Delivered', heading: 'Your order has arrived.', body, siteUrl: o.siteUrl }),
    text,
  };
}

export function backInStockEmail(p: { productName: string; size?: string | null; color?: string | null; url: string }): RenderedEmail {
  const variantText = [p.size && `size ${p.size}`, p.color].filter(Boolean).join(', ');
  const subject = `It's back — ${p.productName}${p.size ? ` in size ${p.size}` : ''}`;
  const body = `
    <p style="margin:0 0 16px">Good news — <strong>${esc(p.productName)}</strong>${variantText ? ` (${esc(variantText)})` : ''} is back in stock.</p>
    <p style="margin:0 0 28px;font-size:14px;color:${MUTED}">Restocks tend to go quickly, so we&rsquo;d grab it while it&rsquo;s here.</p>
    ${button(p.url, 'Shop it now')}
    <p style="margin:24px 0 0;font-size:12px;color:${MUTED}">You&rsquo;re getting this one-time email because you asked to be notified on our site.</p>`;
  return {
    subject,
    html: layout({ preheader: `${p.productName} is back in stock.`, eyebrow: 'Back in stock', heading: 'It&rsquo;s back.', body, siteUrl: new URL(p.url).origin }),
    text: [`Good news — ${p.productName}${variantText ? ` (${variantText})` : ''} is back in stock.`, '', `Shop it now: ${p.url}`].join('\n'),
  };
}

export function itemCancelledEmail(o: OrderEmailData, item: OrderEmailItem, refundAmount: number): RenderedEmail {
  const ref = orderReference(o.orderId);
  const refund = refundAmount > 0
    ? `A refund of <strong>${formatPrice(refundAmount)}</strong> has been started to your original payment method. It usually reaches you in 5–7 working days.`
    : 'As this was a cash-on-delivery order, nothing was charged for this item.';
  const body = `
    <p style="margin:0 0 16px">Hi ${esc(firstName(o.customerName))}, the following item from order <strong>${ref}</strong> has been cancelled:</p>
    ${itemsTable([item])}
    <p style="margin:16px 0 28px">${refund}</p>
    ${button(orderUrl(o), 'View your order')}`;
  const text = [
    `Hi ${firstName(o.customerName)}, ${item.name} (${itemLine(item)}) from order ${ref} has been cancelled.`,
    refundAmount > 0
      ? `A refund of ${formatPrice(refundAmount)} has been started to your original payment method (5–7 working days).`
      : 'As this was a cash-on-delivery order, nothing was charged for this item.',
    `View your order: ${orderUrl(o)}`,
  ].join('\n');
  return {
    subject: `Item cancelled — ${ref}`,
    html: layout({ preheader: `${item.name} has been cancelled.`, eyebrow: 'Cancellation', heading: 'Your item has been cancelled.', body, siteUrl: o.siteUrl }),
    text,
  };
}
