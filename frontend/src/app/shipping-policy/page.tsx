import { LegalPage, Section } from '@/components/ui/LegalPage';

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy" lastUpdated="June 12, 2026">
      <Section title="Free Shipping">
        <p>We offer free standard shipping on all orders above ₹999 across India. Orders below ₹999 carry a flat shipping fee of ₹79.</p>
      </Section>
      <Section title="Processing Time">
        <p>Orders are processed within 1–2 business days of payment confirmation. Orders placed after 3 PM IST may be processed the following business day. Orders are not processed on Sundays and public holidays.</p>
      </Section>
      <Section title="Delivery Timeline">
        <p><strong>Metro Cities</strong> (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Pune, Kolkata): 2–4 business days</p>
        <p><strong>Tier 2 & 3 Cities</strong>: 4–6 business days</p>
        <p><strong>Remote Areas</strong>: 6–10 business days</p>
        <p>Delivery timelines are estimates and may vary during peak seasons, sale periods, or due to logistics delays.</p>
      </Section>
      <Section title="Tracking Your Order">
        <p>Once your order is shipped, you'll receive an SMS and email with a tracking link. You can also track orders from your account dashboard under <strong>My Orders</strong>.</p>
      </Section>
      <Section title="Shipping Partners">
        <p>We ship via Delhivery, Bluedart, and Xpressbees depending on your location and order size. The carrier is automatically selected for the fastest delivery.</p>
      </Section>
      <Section title="Failed Deliveries">
        <p>If a delivery attempt fails, the courier will try again up to 3 times. If all attempts fail, the order will be returned to us and we will initiate a full refund within 7 business days.</p>
      </Section>
    </LegalPage>
  );
}
