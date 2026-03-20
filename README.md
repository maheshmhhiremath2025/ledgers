# Synergific Books

Full-stack accounting app — Invoices, Purchase Orders, Payments, Ledgers with PDF generation. Built with Next.js + MongoDB Atlas, deployable to Vercel.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (Pages Router) |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas (via Mongoose) |
| PDF | Puppeteer Core + @sparticuz/chromium |
| Hosting | Vercel |

---

## MongoDB Atlas Setup (free tier)

1. Go to https://cloud.mongodb.com and sign up / log in
2. Click **"Build a Database"** → choose **M0 Free** tier
3. Select a cloud region (e.g. AWS Mumbai for India)
4. Set a **username** and **password** — save these
5. Under **Network Access** → click **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
6. Go to your cluster → click **Connect** → **Drivers**
7. Copy the connection string — it looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Add your database name to it:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/synergific-books?retryWrites=true&w=majority
   ```

---

## Local Development

```bash
# 1. Clone / download project
cd synergific-books

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.local .env.local
# Edit .env.local and paste your MongoDB URI

# 4. Run dev server
npm run dev

# 5. Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add MONGODB_URI
# Paste your Atlas URI when prompted

# Redeploy with env vars
vercel --prod
```

### Option B — Vercel Dashboard (no CLI)

1. Push code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial Synergific Books"
   git remote add origin https://github.com/YOUR_USERNAME/synergific-books.git
   git push -u origin main
   ```

2. Go to https://vercel.com → **New Project** → Import from GitHub

3. In **Environment Variables** add:
   - `MONGODB_URI` = your Atlas connection string
   - `NEXT_PUBLIC_ORG_NAME` = Synergific (or your org name)
   - `NEXT_PUBLIC_APP_URL` = https://your-app.vercel.app

4. Click **Deploy** — done!

---

## PDF Generation Notes

PDF generation uses Puppeteer + Chromium. On Vercel, install the Vercel-compatible Chromium:

```bash
npm install @sparticuz/chromium
```

Then add to `package.json` dependencies. If PDF download doesn't work on Vercel free tier (function timeout), the app automatically falls back to opening an HTML page in a new tab that you can **Print → Save as PDF** via the browser.

---

## Project Structure

```
synergific-books/
├── pages/
│   ├── index.js              # Main app shell
│   ├── _app.js               # App wrapper
│   └── api/
│       ├── invoices/
│       │   ├── index.js      # GET list, POST create
│       │   ├── [id].js       # GET, PUT, DELETE by ID
│       │   └── [id]/pdf.js   # PDF download
│       ├── purchase-orders/
│       │   ├── index.js
│       │   ├── [id].js
│       │   └── [id]/pdf.js
│       ├── payments/
│       │   └── index.js
│       ├── accounts/
│       │   └── index.js
│       └── dashboard/
│           └── summary.js
├── components/
│   ├── ui/index.js           # Shared UI components
│   ├── Dashboard.js
│   ├── InvoiceList.js
│   ├── InvoiceForm.js
│   ├── POList.js
│   ├── POForm.js
│   ├── PaymentList.js
│   ├── PaymentForm.js
│   └── AccountsList.js
├── models/
│   ├── Invoice.js
│   ├── PurchaseOrder.js
│   ├── Payment.js
│   ├── Account.js
│   └── JournalEntry.js
├── lib/
│   └── mongodb.js            # DB connection
├── styles/
│   └── globals.css
├── .env.local                # Add your MONGODB_URI here
├── vercel.json
└── package.json
```

---

## Multi-Org Usage

The app supports multiple organizations. Each API call includes an `x-org-id` header (set in the frontend based on the selected org). All data is scoped to the org. Switch orgs using the org selector in the sidebar.

---

## Features

| Feature | Status |
|---------|--------|
| Multi-org switcher | ✅ |
| Invoice CRUD | ✅ |
| Invoice PDF download | ✅ |
| Purchase Order CRUD | ✅ |
| PO PDF download | ✅ |
| Payment recording | ✅ |
| Invoice auto-mark paid | ✅ |
| Chart of Accounts | ✅ |
| COA auto-seed per org | ✅ |
| Dashboard summary | ✅ |
| Search & filter | ✅ |
| MongoDB Atlas storage | ✅ |
| Vercel deployment | ✅ |
