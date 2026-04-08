import LegalShell, { H2, P, UL, LI } from '../components/LegalShell'

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="08 April 2026">
      <P>
        HexaLabs ("we", "us", "our") is committed to protecting your privacy. This policy
        explains what information we collect, how we use it, and the rights you have over
        your data when you use HexaLabs Books.
      </P>

      <H2>1. Information We Collect</H2>
      <P>We collect the following categories of information:</P>
      <UL>
        <LI><b>Account information</b> — name, email, password (hashed), organisation name, role.</LI>
        <LI><b>Business data you create</b> — invoices, customers, vendors, products, expenses, payments, bank accounts, journal entries, and any documents you attach.</LI>
        <LI><b>Configuration</b> — your business address, GSTIN, PAN, logo, signature, SMTP credentials (encrypted), payment gateway keys (encrypted).</LI>
        <LI><b>Usage data</b> — log of API calls, IP addresses, browser type, timestamps. Stored in our audit log for security and compliance.</LI>
        <LI><b>Payment information</b> — handled entirely by Razorpay; we never see or store your card details.</LI>
      </UL>

      <H2>2. How We Use Your Information</H2>
      <UL>
        <LI>To provide the Service: storing and displaying your invoices, generating PDFs, sending emails on your behalf.</LI>
        <LI>To process payments and manage subscriptions.</LI>
        <LI>To send transactional emails (welcome, plan upgrade, password reset, invoice reminders).</LI>
        <LI>To improve the Service and detect abuse.</LI>
        <LI>To comply with legal obligations.</LI>
      </UL>
      <P>
        We do <b>not</b> sell, rent, or share your personal data with third parties for
        their marketing purposes. We do not use your business data to train AI models or
        for analytics beyond what is necessary to operate the Service.
      </P>

      <H2>3. Data Storage and Security</H2>
      <UL>
        <LI>Data is stored in MongoDB Atlas (Mumbai region) with encryption at rest and in transit.</LI>
        <LI>File attachments are stored in Vercel Blob with org-scoped access paths.</LI>
        <LI>Passwords are hashed using PBKDF2-SHA512 with 120,000 iterations and a unique salt per account.</LI>
        <LI>Sessions use signed HTTP-only cookies with `SameSite=Lax`.</LI>
        <LI>Each tenant's data is isolated by `orgId`; API endpoints enforce ownership on every request.</LI>
        <LI>Every financial action (invoice / bill / payment / credit note) is recorded in an append-only audit log.</LI>
      </UL>

      <H2>4. Third-Party Services</H2>
      <P>HexaLabs Books uses the following third-party providers to operate:</P>
      <UL>
        <LI><b>Razorpay</b> — payment processing for subscriptions and customer invoices.</LI>
        <LI><b>MongoDB Atlas</b> — database hosting.</LI>
        <LI><b>Vercel</b> — application hosting and Blob storage for attachments.</LI>
        <LI><b>SMTP provider</b> (Gmail / SendGrid / your configured server) — outbound email delivery.</LI>
        <LI><b>Anthropic</b> — powers the in-app support chatbot. Only your typed support questions are sent, not your business data.</LI>
      </UL>

      <H2>5. Cookies</H2>
      <P>
        We use essential cookies only — a session cookie to keep you signed in. We do not
        use advertising or tracking cookies.
      </P>

      <H2>6. Your Rights</H2>
      <P>You have the right to:</P>
      <UL>
        <LI><b>Access</b> — view all data we hold about you via the in-app interface.</LI>
        <LI><b>Export</b> — download your data in CSV or JSON format.</LI>
        <LI><b>Correct</b> — edit or update your information at any time.</LI>
        <LI><b>Delete</b> — request deletion of your account and all associated data.</LI>
        <LI><b>Withdraw consent</b> — close your account at any time.</LI>
      </UL>
      <P>
        To exercise any of these rights, contact us at the email below.
      </P>

      <H2>7. Data Retention</H2>
      <P>
        We retain your data for as long as your account is active. After account closure,
        data is held for 30 days (to handle disputes and accidental deletions) then
        permanently removed from active systems. Backup copies are purged within 90 days.
      </P>

      <H2>8. Children's Privacy</H2>
      <P>
        The Service is not directed at children under 18. We do not knowingly collect
        personal data from minors.
      </P>

      <H2>9. Changes to This Policy</H2>
      <P>
        We may update this Privacy Policy as our practices evolve. Material changes will
        be notified via email or in-app notice. The "Last updated" date at the top reflects
        the most recent revision.
      </P>

      <H2>10. Contact</H2>
      <P>
        Privacy questions, data requests, or concerns: <a href="mailto:privacy@hexalabs.online" style={{ color:'var(--accent-2)' }}>privacy@hexalabs.online</a>.
      </P>
    </LegalShell>
  )
}
