import Link from 'next/link';
import { LegalPage, Section } from '@/components/ui/LegalPage';
import ShippingNote from '@/components/ui/ShippingNote';
import { storePolicy as p } from '@/lib/storePolicy';

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy" lastUpdated={p.lastUpdated}>
      <Section title="Shipping Charges">
        <p>We ship across India. <ShippingNote variant="full" /></p>
        <p>All product prices include taxes. The shipping charge (if any) is the only amount added at checkout — there are no other fees.</p>
      </Section>
      <Section title="Dispatch Time">
        <p>Orders are packed and dispatched within {p.dispatchDays} of being placed (or of payment confirmation for online payments). Orders are not dispatched on Sundays and public holidays.</p>
      </Section>
      <Section title="Delivery Time">
        <p>Delivery usually takes {p.deliveryDays} after dispatch, depending on your location. You can check the estimate for your pincode on any product page.</p>
        <p>Timelines are estimates and can be longer during sales, festivals, bad weather or courier delays.</p>
      </Section>
      <Section title="Tracking Your Order">
        <p>Once your order is dispatched, its courier tracking number appears in <strong>My Account → My Orders</strong>. You can also check the status on our <Link href="/track-order" className="underline">Track Order</Link> page.</p>
      </Section>
      <Section title="Cash on Delivery">
        <p>Cash on Delivery is available on pincodes where our courier partner offers it. There is no extra charge for COD.</p>
      </Section>
      <Section title="Courier Partners">
        <p>We ship through Shiprocket, which selects the best available courier partner for your pincode.</p>
      </Section>
      <Section title="Failed Deliveries">
        <p>The courier usually makes up to 3 delivery attempts. If the parcel comes back to us undelivered, we refund prepaid orders (product price) within {p.refundDays}. Please make sure your address and phone number are correct at checkout.</p>
      </Section>
    </LegalPage>
  );
}
