import { LegalPage, Section } from '@/components/ui/LegalPage';
import { storePolicy } from '@/lib/storePolicy';

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated={storePolicy.lastUpdated}>
      <Section title="What Are Cookies">
        <p>Cookies are small text files stored on your device when you visit a website. We use them (and similar browser storage) only to make the site work — keeping you signed in, remembering your cart and your preferences.</p>
      </Section>
      <Section title="Types of Cookies We Use">
        <p><strong>Essential Cookies</strong>: Required for the site to function. These keep your session active, maintain your cart, and process authentication. You cannot opt out of these.</p>
        <p><strong>Payment</strong>: When you pay online, Razorpay may set cookies needed to complete the payment securely.</p>
        <p><strong>Preferences</strong>: Your browser stores choices such as theme (dark/light mode), your cart, wishlist and recently viewed products.</p>
        <p>We do <strong>not</strong> use advertising, marketing or analytics tracking cookies.</p>
      </Section>
      <Section title="Third-Party Cookies">
        <p>The only third party that may set cookies is our payment gateway, Razorpay, during online payment. Razorpay has its own privacy policy. If we add any analytics or marketing tools in future, we will update this page and ask for your consent first.</p>
      </Section>
      <Section title="Managing Cookies">
        <p>You can control cookies through your browser settings. Note that disabling essential cookies will affect site functionality (your cart may not persist, login sessions may end).</p>
        <p>Most browsers allow you to: view cookies, delete individual cookies, block cookies from specific sites, or block all cookies.</p>
      </Section>
      <Section title="Updates to This Policy">
        <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the platform after changes constitutes acceptance.</p>
      </Section>
    </LegalPage>
  );
}
