import { LegalPage, Section } from '@/components/ui/LegalPage';
import { storePolicy } from '@/lib/storePolicy';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={storePolicy.lastUpdated}>
      <Section title="Information We Collect">
        <p>We collect information you provide directly — your name, email address, phone number and delivery address — when you create an account, place an order, subscribe to our newsletter or contact us. Payments are handled by Razorpay; we never see or store your card details.</p>
        <p>Like most websites, our hosting and security systems record basic technical data (such as IP address and browser type) to keep the site secure and working.</p>
      </Section>
      <Section title="How We Use Your Information">
        <p>We use your information to process and deliver your orders, email you about your order (confirmation, delivery, cancellations and refunds), handle returns, answer your questions, and — only if you subscribe — send you news about new drops and offers. You can unsubscribe from promotional emails at any time using the link in every email.</p>
        <p>If you write a product review, it is shown publicly with your first name and last initial only.</p>
        <p>We never sell your personal data to third parties.</p>
      </Section>
      <Section title="Data Sharing">
        <p>We share data only with trusted partners needed to operate our platform — our payment processor (Razorpay), our shipping partner (Shiprocket and its courier partners), our email delivery provider, and cloud infrastructure providers. All partners are contractually bound to protect your data.</p>
      </Section>
      <Section title="Cookies">
        <p>We use only essential cookies and similar browser storage to keep you signed in, remember your cart and wishlist, and save preferences such as dark/light mode. We do not use advertising or analytics tracking cookies. See our <a href="/cookie-policy" className="underline">Cookie Policy</a>.</p>
      </Section>
      <Section title="Data Retention">
        <p>We retain your account data as long as your account is active. Order data is retained for 7 years for tax and legal compliance. You can request deletion of your account at any time.</p>
      </Section>
      <Section title="Your Rights">
        <p>You have the right to access, correct, or delete your personal data. You can also object to processing or request data portability. To exercise any of these rights, write to us through our <a href="/contact" className="underline">Contact page</a>.</p>
      </Section>
      <Section title="Contact">
        <p>WAR — Without Any Regrets. Contact us through our <a href="/contact" className="underline">Contact page</a>.</p>
      </Section>
    </LegalPage>
  );
}
