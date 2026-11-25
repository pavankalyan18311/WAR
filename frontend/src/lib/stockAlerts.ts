import { sendEmail } from '@/lib/mailer';
import { backInStockEmail } from '@/lib/email/templates';

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Emails everyone waiting for these (just restocked) variants and marks their requests done.
 * Best-effort: never throws; a request whose email failed stays pending for the next restock.
 * Returns how many customers were emailed.
 */
export async function notifyRestocked(supabase: any, variantIds: string[]): Promise<number> {
  if (variantIds.length === 0) return 0;
  try {
    const { data: pending, error } = await supabase
      .from('stock_alerts')
      .select('id, email, variant:product_variants(id, size_option:size_options(name), color:colors(name), product:products(name, slug))')
      .in('variant_id', variantIds)
      .is('notified_at', null);
    if (error) throw error;

    const done: string[] = [];
    for (const alert of pending ?? []) {
      const product = alert.variant?.product;
      if (!product?.slug) continue;
      const email = backInStockEmail({
        productName: product.name,
        size: alert.variant?.size_option?.name ?? null,
        color: alert.variant?.color?.name ?? null,
        url: `${siteUrl()}/products/${product.slug}`,
      });
      const result = await sendEmail({ to: alert.email, ...email });
      if (result.sent) done.push(alert.id);
    }

    if (done.length) {
      await supabase.from('stock_alerts').update({ notified_at: new Date().toISOString() }).in('id', done);
    }
    return done.length;
  } catch (err: any) {
    console.error('[stock alerts] restock notification failed:', err?.message);
    return 0;
  }
}
