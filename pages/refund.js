import LegalShell, { H2, P, UL, LI } from '../components/LegalShell'

export default function RefundPage() {
  return (
    <LegalShell title="Refund & Cancellation Policy" lastUpdated="08 April 2026">
      <P>
        This policy explains how subscription cancellations and refund requests are
        handled for HexaLabs Books.
      </P>

      <H2>1. Subscription Plans</H2>
      <P>
        HexaLabs Books offers three plans:
      </P>
      <UL>
        <LI><b>Starter</b> — Free forever. No payment required.</LI>
        <LI><b>Professional</b> — ₹999 / month, billed monthly.</LI>
        <LI><b>Business</b> — ₹2,499 / month, billed monthly.</LI>
      </UL>
      <P>
        All paid plans grant 30 days of access from the date of payment. There is no
        auto-renewal — your plan will not be charged again unless you manually renew.
      </P>

      <H2>2. Cancellation</H2>
      <P>
        You can cancel anytime by simply not renewing your plan. When the 30-day cycle
        ends, your account is automatically downgraded to the free Starter plan. Your data
        is preserved and you can continue using the free tier indefinitely or upgrade
        again later.
      </P>
      <P>
        There is no cancellation fee and no notice period required.
      </P>

      <H2>3. Refunds</H2>
      <P>
        Because each subscription period is short (30 days) and starts immediately on
        payment, we generally do not offer refunds for partially-used periods. However, we
        will issue a full refund in the following circumstances:
      </P>
      <UL>
        <LI><b>Duplicate charge</b> — If you were billed twice for the same month due to a payment-gateway error, we will refund the duplicate charge in full within 7 working days.</LI>
        <LI><b>Service unavailability</b> — If the Service is unavailable for more than 48 consecutive hours due to our fault (excluding scheduled maintenance), we will refund a pro-rated amount on request.</LI>
        <LI><b>Within 24 hours of upgrade</b> — If you upgrade by mistake and have not used any paid features, contact us within 24 hours of payment for a full refund.</LI>
      </UL>

      <H2>4. How to Request a Refund</H2>
      <P>Email <a href="mailto:billing@hexalabs.online" style={{ color:'var(--accent-2)' }}>billing@hexalabs.online</a> with:</P>
      <UL>
        <LI>The email address linked to your HexaLabs Books account</LI>
        <LI>The Razorpay payment ID or order ID</LI>
        <LI>A brief description of why you're requesting the refund</LI>
      </UL>
      <P>
        We will respond within 2 working days. Approved refunds are processed via the
        original payment method (Razorpay) and typically reflect in your bank account
        within 5–7 working days.
      </P>

      <H2>5. Non-Refundable Items</H2>
      <UL>
        <LI>Subscription periods that are more than 24 hours old and have been actively used.</LI>
        <LI>Per-use service fees (e.g. e-Invoice IRN generation pass-throughs, if applicable).</LI>
        <LI>Charges arising from your customers' payments through the customer portal — these belong to you, not to HexaLabs.</LI>
      </UL>

      <H2>6. Account Closure & Data</H2>
      <P>
        Closing your account does not automatically trigger a refund. If you want both,
        please mention it in your cancellation request. After closure, your data is
        retained for 30 days then permanently deleted.
      </P>

      <H2>7. Contact</H2>
      <P>
        For any billing or refund questions, write to <a href="mailto:billing@hexalabs.online" style={{ color:'var(--accent-2)' }}>billing@hexalabs.online</a>.
      </P>
    </LegalShell>
  )
}
