import { LegalPage, Section } from '@/components/ui/LegalPage';

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Return Policy" lastUpdated="June 12, 2026">
      <Section title="7-Day Return Policy">
        <p>We offer a hassle-free 7-day return window from the date of delivery. If you're not satisfied with your purchase for any reason, you can initiate a return from your account dashboard.</p>
      </Section>
      <Section title="Eligibility for Returns">
        <p>To be eligible for a return, items must be:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>In original, unworn condition with all tags attached</li>
          <li>In the original packaging (or similar protective packaging)</li>
          <li>Not washed, ironed, or dry-cleaned</li>
          <li>Free from stains, odours, or signs of wear</li>
        </ul>
        <p>Items marked as <strong>Final Sale</strong> or <strong>Non-Returnable</strong> on the product page are not eligible for returns.</p>
      </Section>
      <Section title="How to Initiate a Return">
        <p>1. Go to <strong>My Account → My Orders</strong> and click <strong>Return Item</strong> next to the order.</p>
        <p>2. Select the items and reason for return.</p>
        <p>3. Our team will schedule a free pickup within 2 business days.</p>
        <p>4. Once the item is received and quality-checked, your refund will be processed.</p>
      </Section>
      <Section title="Refund Timeline">
        <p><strong>Original Payment Method</strong>: Refunded within 5–7 business days after return pickup.</p>
        <p><strong>Store Credit</strong>: Available within 24 hours of pickup — use it on your next order.</p>
        <p>Shipping charges are non-refundable unless the return is due to a defect or wrong item sent.</p>
      </Section>
      <Section title="Damaged or Wrong Items">
        <p>If you receive a damaged, defective, or incorrect item, contact us within 48 hours of delivery with photos. We'll arrange an immediate replacement or full refund at no cost to you.</p>
      </Section>
      <Section title="Exchange Policy">
        <p>Currently we do not support direct exchanges. Please return the item and place a new order for the desired size or colour. Store credit makes this seamless.</p>
      </Section>
    </LegalPage>
  );
}
