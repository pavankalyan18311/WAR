import { LegalPage, Section } from '@/components/ui/LegalPage';

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated="June 12, 2026">
      <Section title="What Are Cookies">
        <p>Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, keep your cart active, and understand how you use ThreadX so we can improve your experience.</p>
      </Section>
      <Section title="Types of Cookies We Use">
        <p><strong>Essential Cookies</strong>: Required for the site to function. These keep your session active, maintain your cart, and process authentication. You cannot opt out of these.</p>
        <p><strong>Analytics Cookies</strong>: Help us understand traffic patterns and user behaviour (anonymised). We use this data to improve the platform.</p>
        <p><strong>Preference Cookies</strong>: Remember your choices such as theme (dark/light mode), language, and recently viewed products.</p>
        <p><strong>Marketing Cookies</strong>: Used to show you relevant ads on external platforms (only with your consent).</p>
      </Section>
      <Section title="Third-Party Cookies">
        <p>Some cookies are set by third parties such as Google Analytics, Meta Pixel, and Razorpay. These third parties have their own privacy policies. We only enable third-party cookies with your explicit consent.</p>
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
