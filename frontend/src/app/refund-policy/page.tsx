import Link from 'next/link';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { loadStoreSettings } from '@/lib/checkout/storeSettings';
import { LegalPage, Section } from '@/components/ui/LegalPage';
import { storePolicy as p } from '@/lib/storePolicy';

// The return window is edited in Admin → Settings — always show the latest.
export const dynamic = 'force-dynamic';

export default async function RefundPolicyPage() {
  const returnDays = (await loadStoreSettings(getServiceClient()).catch(() => null))?.return_days ?? 7;
  return (
    <LegalPage title="Cancellation, Return & Refund Policy" lastUpdated={p.lastUpdated}>
      <Section title="Cancelling an Order">
        <p>You can cancel an order — or individual items in it — any time before it is dispatched, from <strong>My Account → My Orders</strong>.</p>
        <p>For online payments, the refund is started automatically and reaches your original payment method within {p.refundDays}. Cash on Delivery orders are simply cancelled; nothing is charged.</p>
        <p>Once an order has been dispatched it can no longer be cancelled, but you can return it after delivery (see below).</p>
      </Section>

      <Section title={`${returnDays}-Day Returns & Size Exchanges`}>
        <p>Not happy with your purchase or need a different size? You can request a return or size exchange within <strong>{returnDays} days of delivery</strong>.</p>
        <p>To be eligible, the item must be:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Unworn, unwashed and unaltered, with all original tags attached</li>
          <li>Free from stains, perfume, odours or other signs of use</li>
          <li>Returned with everything it came with, in suitable packaging</li>
        </ul>
        <p>Size exchanges depend on stock. If your size is not available, we will refund the item instead.</p>
      </Section>

      <Section title="How to Request a Return or Exchange">
        <p>1. Send us a message through our <Link href="/contact" className="underline">Contact page</Link> with your <strong>order reference</strong> (e.g. WAR-1A2B3C4D), the item, and the reason.</p>
        <p>2. We will confirm within 2 business days and arrange a reverse pickup if your pincode is serviceable by our courier partner. If it is not, we will share the address to send the item to.</p>
        <p>3. Once the item reaches us and passes a quality check, we process your exchange or refund.</p>
      </Section>

      <Section title="Refunds">
        <p><strong>Online payments</strong> (UPI, cards, net banking, wallets): refunded to the original payment method within {p.refundDays} after the quality check.</p>
        <p><strong>Cash on Delivery</strong>: refunded to a UPI ID or bank account that you share with us, within {p.refundDays} after the quality check.</p>
        <p>Shipping charges are not refundable on returns, except when the item was damaged, defective or not what you ordered.</p>
      </Section>

      <Section title="Damaged, Defective or Wrong Items">
        <p>If something arrives damaged, defective or different from what you ordered, contact us within <strong>{p.damageReportHours} hours of delivery</strong> with clear photos of the item and packaging. We will send a free replacement or give you a full refund including shipping.</p>
      </Section>
    </LegalPage>
  );
}
