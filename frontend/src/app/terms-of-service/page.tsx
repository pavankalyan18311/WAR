import Link from 'next/link';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { loadStoreSettings } from '@/lib/checkout/storeSettings';
import { LegalPage, Section } from '@/components/ui/LegalPage';
import { storePolicy } from '@/lib/storePolicy';
import { siteConfig } from '@/lib/siteConfig';

const business = siteConfig.legalName || 'WAR — Without Any Regrets';
const link = (href: string, text: string) => <Link href={href} className="underline">{text}</Link>;

// The return window is edited in Admin → Settings — always show the latest.
export const dynamic = 'force-dynamic';

export default async function TermsOfServicePage() {
  const returnDays = (await loadStoreSettings(getServiceClient()).catch(() => null))?.return_days ?? 7;
  const grievance = [
    siteConfig.grievanceOfficerName,
    siteConfig.grievanceOfficerEmail && `Email: ${siteConfig.grievanceOfficerEmail}`,
    siteConfig.grievanceOfficerPhone && `Phone: ${siteConfig.grievanceOfficerPhone}`,
  ].filter(Boolean);

  return (
    <LegalPage title="Terms & Conditions" lastUpdated={storePolicy.lastUpdated}>
      <Section title="1. About These Terms">
        <p>
          This website is operated by {business}{siteConfig.address ? <>, {siteConfig.address}</> : null} (&ldquo;WAR&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
          By browsing the website, creating an account or placing an order, you agree to these Terms &amp; Conditions,
          our {link('/privacy-policy', 'Privacy Policy')}, {link('/shipping-policy', 'Shipping Policy')} and{' '}
          {link('/refund-policy', 'Cancellation, Return & Refund Policy')}. If you do not agree, please do not use the website.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old and able to enter into a binding contract under Indian law to place an order.
          If you are under 18, you may use the website only with the involvement and consent of a parent or legal guardian.
        </p>
      </Section>

      <Section title="3. Your Account">
        <p>
          You are responsible for keeping your login details confidential and for all activity under your account.
          Please give accurate, complete information (including your delivery address and phone number) and keep it up to date.
          Tell us immediately through our {link('/contact', 'Contact page')} if you suspect unauthorised use of your account.
        </p>
        <p>We may suspend or close accounts that are used fraudulently, abusively or in breach of these terms.</p>
      </Section>

      <Section title="4. Products, Colours & Sizes">
        <p>
          We try to describe and photograph our products as accurately as possible. Colours may look slightly different
          depending on your screen, and measurements in the size guide may vary slightly from piece to piece.
          Product images are for illustration; styling and accessories shown are not included unless stated.
        </p>
      </Section>

      <Section title="5. Prices">
        <p>
          All prices are in Indian Rupees (INR) and include all applicable taxes. The only additional amount is the shipping
          charge (if any), which is shown clearly before you pay. Prices and offers may change at any time, but the price you
          see at checkout is the price you pay for that order.
        </p>
        <p>
          If a product is listed at an obviously incorrect price because of a technical or typing error, we may cancel the
          order and refund any amount paid in full.
        </p>
      </Section>

      <Section title="6. Orders & Acceptance">
        <p>
          Placing an order is an offer to buy. The order is accepted when we confirm it on screen or in My Orders. We may
          decline or cancel an order — for example if an item is out of stock, the address cannot be served, or the order
          appears fraudulent. If we cancel, any amount you paid is refunded in full to your original payment method.
        </p>
      </Section>

      <Section title="7. Payments">
        <p>
          Online payments (UPI, cards, net banking and wallets) are processed securely by our payment partner, Razorpay.
          We never see or store your full card details. For Cash on Delivery, please pay the courier the exact order amount
          when your order arrives; COD may not be available on every pincode.
        </p>
      </Section>

      <Section title="8. Shipping, Cancellations & Returns">
        <p>
          Delivery timelines and charges are explained in our {link('/shipping-policy', 'Shipping Policy')}. You can cancel an
          order before it is dispatched, and return or exchange eligible items within {returnDays} days of delivery,
          as described in our {link('/refund-policy', 'Cancellation, Return & Refund Policy')}. Risk in the products passes to
          you on delivery.
        </p>
      </Section>

      <Section title="9. Coupons & Offers">
        <p>
          Coupons and offers are subject to their own conditions (such as minimum order value, validity dates and usage
          limits), cannot be exchanged for cash, and generally cannot be combined. If an order using a coupon is partly
          cancelled or returned, the refund is adjusted for the discount applied. We may withdraw an offer or cancel orders
          that misuse it.
        </p>
      </Section>

      <Section title="10. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>use the website for any unlawful or fraudulent purpose, or place orders for resale without our permission;</li>
          <li>try to gain unauthorised access to the website, other accounts or our systems, or disrupt the website;</li>
          <li>copy, scrape or reuse our content, images or designs without written permission;</li>
          <li>post or send anything that is false, abusive, offensive or infringes anyone&rsquo;s rights.</li>
        </ul>
      </Section>

      <Section title="11. Intellectual Property">
        <p>
          All content on this website — including the WAR name and logo, designs, graphics, product images and text — belongs
          to us or our licensors and is protected by Indian and international intellectual property laws. You may view it for
          personal shopping only; any other use needs our prior written consent.
        </p>
      </Section>

      <Section title="12. Third-Party Services">
        <p>
          We use trusted third parties to run the store, such as Razorpay for payments and Shiprocket and its courier partners
          for delivery. Their services are subject to their own terms, and we are not responsible for their independent acts or
          omissions, though we will help you resolve any issue with your order.
        </p>
      </Section>

      <Section title="13. Limitation of Liability">
        <p>
          To the extent permitted by law, we are not liable for indirect, incidental or consequential losses arising from your
          use of the website. Our total liability for any order is limited to the amount you paid for that order. Nothing in
          these terms limits your rights as a consumer under Indian law.
        </p>
      </Section>

      <Section title="14. Events Beyond Our Control">
        <p>
          We are not responsible for delays or failures caused by events beyond our reasonable control, such as natural
          disasters, strikes, lockdowns, courier or network disruptions. We will keep you informed and, if an order cannot be
          fulfilled, refund it in full.
        </p>
      </Section>

      <Section title="15. Changes to These Terms">
        <p>
          We may update these terms from time to time. The latest version is always on this page with its &ldquo;Last
          updated&rdquo; date. Orders are governed by the terms in force when they were placed.
        </p>
      </Section>

      <Section title="16. Governing Law & Disputes">
        <p>
          These terms are governed by the laws of India. We will always try to resolve any concern with you first — please
          contact us. Any dispute that cannot be resolved amicably will be subject to the jurisdiction of the competent courts
          at the place where our business is registered, without affecting your right to approach a consumer commission.
        </p>
      </Section>

      <Section title="17. Contact & Grievance Officer">
        <p>For questions about an order or these terms, please reach us through our {link('/contact', 'Contact page')}.</p>
        {siteConfig.address && <p>Address: {business}, {siteConfig.address}</p>}
        <p>
          In accordance with the Consumer Protection (E-Commerce) Rules, 2020, complaints can be addressed to our Grievance
          Officer{grievance.length ? ':' : ' through our Contact page.'}
        </p>
        {grievance.length > 0 && (
          <p>{grievance.map((line, i) => <span key={i} className="block">{line}</span>)}</p>
        )}
        <p>We acknowledge complaints within 48 hours and aim to resolve them within one month.</p>
      </Section>
    </LegalPage>
  );
}
