import { LegalPage, Section } from '@/components/ui/LegalPage';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="June 12, 2026">
      <Section title="Information We Collect">
        <p>We collect information you provide directly — name, email address, phone number, shipping address, and payment details when you create an account or place an order.</p>
        <p>We also automatically collect device data (browser type, IP address, pages visited) via cookies and similar technologies to improve your experience.</p>
      </Section>
      <Section title="How We Use Your Information">
        <p>We use your information to process orders, send order confirmations and shipping updates, provide customer support, personalise product recommendations, and send marketing communications (only if you opt in).</p>
        <p>We never sell your personal data to third parties.</p>
      </Section>
      <Section title="Data Sharing">
        <p>We share data only with trusted partners needed to operate our platform — payment processors (Razorpay/Stripe), shipping partners (Delhivery, Bluedart), and cloud infrastructure providers. All partners are contractually bound to protect your data.</p>
      </Section>
      <Section title="Cookies">
        <p>We use essential cookies to keep your cart and session active. We also use analytics cookies (anonymised) to understand how shoppers use the site. You can manage cookie preferences at any time via our Cookie Policy page.</p>
      </Section>
      <Section title="Data Retention">
        <p>We retain your account data as long as your account is active. Order data is retained for 7 years for tax and legal compliance. You can request deletion of your account at any time.</p>
      </Section>
      <Section title="Your Rights">
        <p>You have the right to access, correct, or delete your personal data. You can also object to processing or request data portability. To exercise any of these rights, email us at <strong>privacy@threadx.in</strong>.</p>
      </Section>
      <Section title="Contact">
        <p>ThreadX, 42 Koramangala Industrial Layout, Bengaluru - 560095, Karnataka, India. Email: privacy@threadx.in</p>
      </Section>
    </LegalPage>
  );
}
