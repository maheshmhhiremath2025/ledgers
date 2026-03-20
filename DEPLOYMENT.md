# Synergific Books — Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- MongoDB Atlas account (free tier works)
- Domain name (optional but recommended)

---

## Step 1 — Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit — Synergific Books"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/synergific-books.git
git push -u origin main
```

---

## Step 2 — MongoDB Atlas Production Setup

1. Go to **cloud.mongodb.com** → your cluster
2. Click **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - This is required for Vercel's dynamic IPs
3. Click **Database Access** → make sure your user has **readWriteAnyDatabase** role
4. Click **Connect** → **Connect your application** → copy the connection string

Your URI looks like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/synergific-books?retryWrites=true&w=majority
```

---

## Step 3 — Deploy on Vercel

1. Go to **vercel.com** → **New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** and add ALL of these:

### Required Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | your Atlas URI | From Step 2 |
| `SESSION_SECRET` | 64-char random string | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.vercel.app` | Your Vercel URL (update after first deploy) |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxx` | From Razorpay Dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | your secret | Same place |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | same as KEY_ID | Must be public |
| `RAZORPAY_WEBHOOK_SECRET` | your webhook secret | Set in Razorpay → Webhooks |
| `SMTP_HOST` | `smtp.gmail.com` | Or your provider |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | your Gmail | |
| `SMTP_PASS` | your App Password | 16-char Gmail App Password |
| `SMTP_FROM` | `Synergific Books <you@gmail.com>` | |
| `CRON_SECRET` | any random string | e.g. `my-secret-cron-key-2026` |

5. Click **Deploy**

---

## Step 4 — After First Deploy

### Update APP_URL
1. Copy your Vercel URL (e.g. `https://synergific-books.vercel.app`)
2. Go to Vercel → Project → **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_APP_URL` to your actual URL
4. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy)

### Set Razorpay Webhook
1. Go to **Razorpay Dashboard** → Settings → Webhooks → **Add New Webhook**
2. URL: `https://yourapp.vercel.app/api/billing/webhook`
3. Secret: same as `RAZORPAY_WEBHOOK_SECRET`
4. Events: tick **payment.captured**, **order.paid**
5. Click Save

---

## Step 5 — Custom Domain (Optional)

1. Vercel → Project → **Settings** → **Domains**
2. Add your domain: `books.yourbusiness.com`
3. Copy the CNAME record Vercel gives you
4. Go to your domain registrar (GoDaddy, Namecheap etc.)
5. Add the CNAME record
6. Update `NEXT_PUBLIC_APP_URL` env var to `https://books.yourbusiness.com`
7. Redeploy

---

## Step 6 — Recurring Invoice Cron (Auto-Vercel)

The `vercel.json` already includes a cron job:
```json
"crons": [{
  "path": "/api/recurring/run?secret=REPLACE_WITH_YOUR_CRON_SECRET",
  "schedule": "0 6 * * *"
}]
```

**Important:** Replace `REPLACE_WITH_YOUR_CRON_SECRET` in `vercel.json` with your actual `CRON_SECRET` value before deploying.

This runs daily at 6 AM UTC — creates all due recurring invoices automatically.

> Note: Cron jobs require Vercel **Pro** plan ($20/mo). On the free plan, trigger manually via the **▶ Run Now** button in the Recurring page, or set up a free external cron at **cron-job.org** pointing to:
> `GET https://yourapp.vercel.app/api/recurring/run?secret=YOUR_CRON_SECRET`

---

## Step 7 — Production Checklist

Before going live, verify:

- [ ] MongoDB Network Access allows `0.0.0.0/0`
- [ ] All env vars set in Vercel (not just `.env.local`)
- [ ] `NEXT_PUBLIC_APP_URL` matches your actual domain
- [ ] Razorpay webhook URL updated to production domain
- [ ] Switch Razorpay from **test** keys to **live** keys
- [ ] Gmail App Password working (send a test invoice)
- [ ] Create your admin account via `/` signup
- [ ] Set up your business details in Configuration
- [ ] Run Ledger → ⟳ Sync Ledgers to backfill existing data

---

## Switching Razorpay to Live Mode

1. Razorpay Dashboard → toggle **Test Mode → Live Mode**
2. Generate new **Live API Keys**
3. Update in Vercel env vars:
   - `RAZORPAY_KEY_ID` → `rzp_live_xxxxx`
   - `RAZORPAY_KEY_SECRET` → live secret
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` → same live key
4. Update webhook URL to live domain
5. Redeploy

---

## Troubleshooting

**Build fails:** Run `npm run build` locally first to catch errors.

**MongoDB connection fails:** Check Network Access allows `0.0.0.0/0` in Atlas.

**Emails not sending:** Verify Gmail App Password in Vercel env vars (not your login password).

**Razorpay payment fails:** Confirm you're using live keys and webhook is configured.

**Session issues after deploy:** Make sure `SESSION_SECRET` is set and consistent across redeployments.

**NEXT_PUBLIC vars not working:** These must be set before build time. Change them → Redeploy.
