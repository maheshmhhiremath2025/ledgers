# HexaLabs Books

A full-stack, multi-tenant accounting & invoicing platform for Indian SMBs. Built with Next.js + MongoDB, hosted on Vercel.

Live: https://ledgers.hexalabs.online

---

## Features

### Sales
- **Invoices** — multiple PDF templates, GST split (CGST/SGST or IGST), payment portal, recurring schedules, customer auto-create
- **Estimates / Quotations** — convert to invoice in one click
- **Credit Notes** — atomic, with auto-rollback on failure
- **Payment Portal** — public link with Razorpay checkout, partial payments, expiring tokens
- **Customer statements**, aged receivables, recurring invoices

### Purchases
- **Purchase Orders** — vendor auto-create
- **Vendor Bills** — record, attach scanned PDF/image, pay, post journal
- **Vendors**, products, categories
- **Aged payables**, TDS tracking by section

### Accounting
- **Bank & Cash accounts** with opening / current balance tracking
- **Chart of Accounts** with double-entry journal posting
- **Journal Entries** — auto-posted on invoice raised, payment received, payment made, bill recorded, credit note issued
- **Reports**: P&L, Balance Sheet, Trial Balance, Cash Flow, GST returns, Aged AR/AP, Customer Statement, TDS Summary

### Operations
- **Multi-organisation** support per user (Business plan)
- **Team & roles** — admin / accountant / viewer
- **Audit log** — every financial action recorded with actor, IP, before/after JSON
- **Bulk CSV import** for customers, vendors, products
- **Document attachments** via Vercel Blob (per-org isolated paths)
- **Configurable email** (SMTP per-org or global env)

### Security
- Tenant isolation: every API derives `orgId` from session, never trusts headers
- PBKDF2-SHA512 password hashing with 120,000 iterations + constant-time compare
- Auto-upgrade legacy hashes on next successful login
- Atomic per-org sequence counters (invoice/PO/payment numbers race-free)
- HttpOnly session cookies + Bearer token fallback
- Append-only audit log
- Vercel Blob attachments scoped per-org

### Billing
- Razorpay subscriptions — Starter (free), Professional (₹999/mo), Business (₹2,499/mo)
- 30-day cycles, no auto-renewal, manual renewal stacks remaining days
- Auto-downgrade to Starter on expiry; data preserved
- Welcome + plan-upgrade emails

### Internal
- **Superadmin dashboard** — org list, drill-down by entity, edit/delete any record, cascade-delete entire org

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend / Backend | Next.js 14 (Pages Router) |
| Database | MongoDB Atlas (via Mongoose) |
| PDF | PDFKit + HTML templates |
| Auth | Custom session + PBKDF2 |
| Payments | Razorpay (Subscriptions + Orders) |
| File storage | Vercel Blob |
| Email | Nodemailer (SMTP) |
| Support chat | Anthropic Claude |
| Hosting | Vercel |

---

## Local development

```bash
git clone https://github.com/maheshmhhiremath2025/ledgers.git
cd ledgers
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

---

## Required environment variables

Set these in Vercel → Project Settings → Environment Variables (Production + Preview + Development).

### Core
| Var | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Long random string used to sign session cookies. **App will not boot without this.** |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, e.g. `https://ledgers.hexalabs.online` |
| `CRON_SECRET` | Random string used to authenticate the recurring-invoice cron endpoint |

### Email (used for welcome / upgrade / password-reset / support / invoice emails when no per-org SMTP is set)
| Var | Example |
|---|---|
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | apikey-or-username |
| `SMTP_PASS` | secret |
| `SMTP_FROM` | "HexaLabs Books <no-reply@hexalabs.online>" |

### Razorpay
| Var | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Live key id |
| `RAZORPAY_KEY_SECRET` | Live key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret from Razorpay dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID`, exposed to client checkout |

### File storage
| Var | Notes |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Auto-set when you connect a Vercel Blob store to the project |

### AI support chat
| Var | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Powers the in-app support chatbot |

### Internal admin
| Var | Notes |
|---|---|
| `SUPERADMIN_EMAILS` | Comma-separated list of emails allowed to access `/superadmin` |

### Optional — GST e-Invoice (currently dormant)
| Var | Notes |
|---|---|
| `EINVOICE_PROVIDER_URL` | Your GSP provider's IRP API base URL |
| `EINVOICE_CLIENT_ID` | GSP client id |
| `EINVOICE_CLIENT_SECRET` | GSP client secret |

---

## Razorpay setup

1. Create a Razorpay account, complete KYC.
2. Switch to Live mode → API keys → generate live keys.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` in Vercel.
4. Webhooks → Create webhook → URL: `https://your-domain/api/billing/webhook` → events: `payment.captured`, `subscription.activated`, `subscription.charged`, `subscription.cancelled` → save the secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Verify by signing up a new account and upgrading to a paid plan; you should receive a "Plan activated" email.

---

## Vercel Blob setup

1. Vercel dashboard → Storage → Create → Blob → name it (e.g. `ledgers-storage`).
2. Click **Connect Project** → select your project → all environments → Connect.
3. Vercel auto-injects `BLOB_READ_WRITE_TOKEN`. Trigger a redeploy.
4. Verify by uploading a file to a Vendor Bill or Expense in the app.

---

## Recurring invoice cron

The recurring-invoice runner is exposed at `GET /api/recurring/run?secret=$CRON_SECRET`. Configure a daily cron job (e.g. cron-job.org or Vercel Cron) to call it. It is idempotent — only invoices whose `nextDate` has passed are generated.

---

## Pages

| Path | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/app` | Authenticated app shell |
| `/forgot` | Forgot password |
| `/reset/[token]` | Password reset confirmation |
| `/pay/[token]` | Public customer payment portal |
| `/invite/[token]` | Team invite acceptance |
| `/superadmin` | Internal HexaLabs admin (requires `SUPERADMIN_EMAILS`) |
| `/terms`, `/privacy`, `/refund` | Legal pages |

---

## Project status

Production-ready for Indian SMB use. See the audit / "still pending" notes inside the codebase for the longer-tail improvements (inventory, multi-currency, full mobile polish, public REST API, e-Invoice IRN UI, etc.).

## License

Proprietary © HexaLabs.
