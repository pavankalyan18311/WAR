import { LegalPage, Section } from '@/components/ui/LegalPage';

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="June 12, 2026">
      <Section title="Acceptance of Terms">
        <p>By accessing or using the ThreadX platform (website and mobile app), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.</p>
      </Section>
      <Section title="Use of the Platform">
        <p>You may use ThreadX only for lawful purposes and in accordance with these terms. You agree not to misuse the platform, engage in fraudulent activity, or attempt to access unauthorized areas.</p>
        <p>You must be at least 18 years old to create an account and make purchases.</p>
      </Section>
      <Section title="Orders & Payments">
        <p>All prices are listed in Indian Rupees (INR) and include applicable taxes. Prices may change without notice. We reserve the right to cancel orders due to pricing errors, stock unavailability, or suspected fraud.</p>
        <p>Payment is processed at the time of order placement. We accept UPI, credit/debit cards, net banking, and cash on delivery (COD).</p>
      </Section>
      <Section title="Product Descriptions">
        <p>We strive for accuracy in product descriptions, images, and specifications. However, colours may vary slightly due to screen calibration. Fabric weights and measurements are approximate.</p>
      </Section>
      <Section title="Intellectual Property">
        <p>All content on the ThreadX platform — including logos, product images, text, and design — is owned by ThreadX or its licensors and protected by Indian and international copyright laws. You may not reproduce, distribute, or modify any content without prior written consent.</p>
      </Section>
      <Section title="Limitation of Liability">
        <p>To the maximum extent permitted by law, ThreadX is not liable for any indirect, incidental, or consequential damages arising from your use of the platform or products purchased.</p>
      </Section>
      <Section title="Governing Law">
        <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka.</p>
      </Section>
    </LegalPage>
  );
}
