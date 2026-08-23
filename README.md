# 💇‍♀️ Belezia Salon Laxmi Nagar - Mobile-First Salon POS & Billing Application

A modern, high-performance, mobile-first Salon Point of Sale (POS) Progressive Web Application built with **Next.js (App Router)**, **Tailwind CSS**, **Lucide Icons**, and **Supabase (PostgreSQL)**.

---

## ✨ Features

- 🧾 **Receptionist-First Fast POS**: Quick customer autocomplete, catalog search with category tabs, manual price overrides, item discounts, and bill-level discounts.
- 👥 **Split-Staff Commission Engine**: Line-item level primary & secondary staff assignment with customizable split ratios (50/50, 60/40, 70/30, or custom %) and real-time incentive calculation.
- 🖨️ **Thermal Receipt & PDF Printer**: Pixel-perfect **80mm and 58mm Thermal POS** format + standard **A4 Invoice** layout.
- 📱 **Dynamic QR Codes**: Auto-generates **Google Review QR**, **Instagram Profile QR**, and **Instant UPI Payment QR** directly on receipts and payment screens.
- 💬 **One-Tap WhatsApp Share**: Automatically generates formatted receipt messages and links to send directly to customer mobile numbers.
- 📊 **Executive Sales Dashboard**: Real-time Gross Sales, Avg Ticket, Expenses, and Net Profit metrics with daily/weekly/monthly filters.
- 🏆 **Staff Performance & Incentive Leaderboard**: Track services rendered, retail recommended, sales volume generated, and earned commission per stylist. Toggle staff Active / On Leave status on the fly.
- 💸 **Expense Tracker**: Log salon operational expenses (supplies, electricity, rent, tea/refreshments) with category tags.
- ⚡ **PWA Ready**: Works offline with local demo storage; installable on iPad, Android tablets, iPhones, and desktop browsers.

---

## 🚀 Quick Start (macOS & Windows)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3001`** in your browser (or on iPad / mobile on the local network).

---

## 🗄️ Database Setup (Supabase / PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire SQL migration script from `supabase/schema.sql`.
4. Copy your Project URL and Anon Key into `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note**: If Supabase keys are omitted, the app automatically runs in **Offline Demo Mode** with pre-seeded demo stylists, treatments, inventory, and invoices stored in browser localStorage.

---

## 📁 Project Structure

```
salon-billing-app/
├── supabase/
│   └── schema.sql            # PostgreSQL schema with tables, RLS, & seed data
├── src/
│   ├── app/
│   │   ├── globals.css       # Tailwind CSS & thermal print media styles
│   │   ├── layout.tsx        # Root layout, PWA meta, and Google Fonts
│   │   └── page.tsx          # Main POS & Dashboard view router
│   ├── components/
│   │   ├── billing/
│   │   │   ├── BillingPos.tsx        # Master POS orchestrator
│   │   │   ├── CustomerSelector.tsx  # Progressive disclosure customer form
│   │   │   ├── CatalogGrid.tsx       # Dynamic services & products grid
│   │   │   ├── CartItemList.tsx      # Cart items with split-staff triggers
│   │   │   ├── SplitStaffModal.tsx   # Stylist split ratio & incentive preview
│   │   │   └── PaymentModal.tsx      # Multi-mode payment & dynamic UPI QR
│   │   ├── invoice/
│   │   │   ├── ThermalReceipt.tsx    # 80mm/58mm/A4 receipt with QR codes
│   │   │   └── InvoicePrintModal.tsx # Print preview & WhatsApp share
│   │   ├── dashboard/
│   │   │   ├── SalesOverview.tsx     # KPI metrics & revenue charts
│   │   │   ├── StaffPerformance.tsx  # Stylist incentive leaderboard
│   │   │   ├── ExpenseManager.tsx    # Salon overheads logger
│   │   │   └── RecentInvoices.tsx    # Transaction log & reprint action
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            # Desktop header & live clock
│   │   │   └── BottomNav.tsx         # Mobile bottom navigation bar
│   │   └── ui/                       # Reusable UI primitives
│   ├── context/
│   │   └── AppContext.tsx    # Central state provider
│   ├── lib/
│   │   ├── calculations.ts   # Invoice totals & staff commission algorithms
│   │   ├── storage.ts        # Storage repository & demo state engine
│   │   ├── supabaseClient.ts # Supabase client initialization
│   │   └── utils.ts          # Formatters, invoice numbers, WhatsApp URL
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── public/
│   ├── manifest.json         # PWA Manifest
│   └── icon.svg              # App Icon
└── package.json
```
