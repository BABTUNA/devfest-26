# AI Block Marketplace

A **modular AI block marketplace** where users browse, buy, and run individual AI-powered blocks (e.g. “Summarize Text”, “Extract Emails”). Each block is sold and metered separately using [Flowglad](https://flowglad.com) for billing, entitlements, and checkout.

---

## What we're building

- **Product:** A catalog of **callable AI blocks** — small tools (summarize, extract emails, classify, etc.) that users can run on demand. This is **not** a full workflow engine; it’s a set of **individually monetized smart tools**.
- **Frontend:** Block library (browse, run, or unlock), dashboard (canvas with blocks), checkout (purchase/unlock), profile (subscriptions, usage, invoices).
- **Backend:** Run a block (with access checks), record usage, serve products and entitlements, create checkout sessions. Flowglad is the **billing and entitlement layer** that decides who can run which block and how they’re charged.

---

## All Flowglad features in use

This project uses every major Flowglad surface — products, pricing, usage, entitlements, subscriptions, discounts, checkout, invoices, webhooks, and optional org billing — making the demo strong for judges (most teams only showcase basic pricing or checkout).

| Feature | Usage in project |
|--------|-------------------|
| **Products** | Each AI block (e.g. Summarize Text, Extract Emails) is modeled as a Flowglad product. |
| **Prices** | Blocks have usage-based pricing or are bundled under subscription plans. |
| **Usage-based billing** | Each execution of a block triggers usage recording (e.g. `createUsageEvent` / Flowglad usage API). |
| **Entitlements** | Access to a block is gated using `checkFeatureAccess()` (Flowglad entitlements). |
| **Subscriptions** | Users can unlock a group of blocks or unlimited usage via subscription. |
| **Discounts** | Coupons for trials, bundles, or hackathon-only promos (Flowglad discount/coupon support). |
| **Checkout** | “Unlock” / “Purchase” opens Flowglad-hosted checkout via `createCheckoutSession({ priceSlug, successUrl, cancelUrl })`. |
| **Entitlements** | Before running a block we call `checkFeatureAccess(block.featureSlug)` to allow or show “locked”. |
| **Usage-based billing** | Each execution of a block triggers usage recording (e.g. `createUsageEvent` / Flowglad usage API). |
| **Subscriptions** | Blocks or packs sold as subscriptions; entitlements and usage tied to the customer’s subscription. |
| **Invoices** | Invoices shown in user profile, powered by Flowglad invoice API. |
| **Webhooks** | `POST /api/webhook` listens for events (new entitlements, subscription started, etc.). |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, ReactFlow, Zustand, Lucide Icons, `@flowglad/nextjs` |
| **Backend** | Express, TypeScript, `@flowglad/server`, Claude (Anthropic) or mock |
| **Shared** | Block definitions and types (workspace `shared`) |

---

## Quick start

### 1. Install and build shared

```bash
npm install --legacy-peer-deps
npm run build -w shared
```

Use `--legacy-peer-deps` if you hit React/Next peer dependency conflicts.

### 2. Environment variables

**Demo mode (no keys needed)** — for a short workflow demo without Flowglad or DB:

- **Backend** `backend/.env`: set `DEMO_MODE=true`
- **Frontend** `frontend/.env.local`: set `NEXT_PUBLIC_DEMO_MODE=true`

All blocks are then runnable; entitlements and usage are skipped. AI blocks use mock responses unless you add `ANTHROPIC_API_KEY`.

**Backend** — create `backend/.env` (see `backend/.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DEMO_MODE` | No | Set to `true` to skip Flowglad (all blocks runnable, no billing) |
| `FLOWGLAD_SECRET_KEY` | When not demo | Secret key from [Flowglad Dashboard](https://app.flowglad.com) |
| `ANTHROPIC_API_KEY` | No | For real Claude blocks; omit for mock responses |
| `PORT` | No | Server port (default `4000`) |
| `FRONTEND_URL` | No | CORS origin (default `http://localhost:3000`) |

**Frontend** — create `frontend/.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | No | Set to `true` so all blocks show as unlocked (use with backend `DEMO_MODE`) |
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default `http://localhost:4000`) |

### 3. Run

```bash
npm run dev
```

- **Backend:** http://localhost:4000  
- **Frontend:** http://localhost:3000  

### 4. Flowglad dashboard setup

To unlock and bill blocks for real:

1. Create an account at [app.flowglad.com](https://app.flowglad.com) and add `FLOWGLAD_SECRET_KEY` to `backend/.env`.
2. Create a **pricing model** and **products** for your blocks.
3. For each block, create **features** whose slugs match `shared/src/blocks.ts`:
   - `featureSlug` (e.g. `block_summarize_text`) — used for `checkFeatureAccess`
   - `priceSlug` (e.g. `summarize_text_usage`) — used for checkout
   - `usageMeterSlug` (e.g. `summarize_text_runs`) — for usage-based blocks

Without this, blocks stay “locked” and checkout will not complete.

---

## Project layout

```
devfest/
├── frontend/                 # Next.js app
│   ├── src/app/              # dashboard, block-library, checkout, profile
│   └── src/components/       # BlockCard, BlockNode, etc.
├── backend/                  # Express API
│   └── src/
│       ├── lib/              # flowglad, auth
│       ├── routes/           # run-block, products, entitlements, checkout, webhook
│       └── services/         # AI runners (Claude), merge-pdfs stub
├── shared/                   # Block definitions and types
│   └── src/blocks.ts         # featureSlug, priceSlug, usageMeterSlug per block
├── Protosynthesis-main/      # Reference project (auth, workflow patterns)
└── package.json              # Workspaces root
```

---

## API (backend)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/flowglad/*` | Flowglad SDK (expressRouter) — used by frontend `useBilling()` |
| POST | `/api/run-block` | Run block. Body: `{ blockId, inputs }`. Checks entitlement, runs block, logs usage. |
| GET | `/api/products` | List block products (from `shared`) |
| GET | `/api/entitlements` | Current user’s feature access and subscriptions |
| POST | `/api/checkout` | Create checkout session. Body: `priceSlug`, `successUrl`, `cancelUrl`. |
| POST | `/api/webhook` | Placeholder (Flowglad uses live SDK; no webhooks required) |
| GET | `/health` | Health check |

---

## Demo blocks

| Block | Function | AI | Monetization |
|-------|----------|-----|--------------|
| Summarize Text | TL;DR of pasted text | Claude | Usage |
| Extract Emails | Extract emails from text | Claude | Usage |
| Rewrite Prompt | Reframe for clarity | Claude | Usage |
| Classify Input | Positive / neutral / negative | Claude | Usage |
| Merge PDFs | Merge PDFs (stub) | No | Subscription |

Block metadata (slugs, inputs, outputs) lives in `shared/src/blocks.ts`.

---

## Auth

- **Current:** Frontend uses Supabase login (`/login`, `/signup`) and sends `Authorization: Bearer <jwt>` to the backend.
- **Backend:** JWTs are validated with Supabase and `user.id` is used as the authenticated customer identity. Demo mode still exists via `NEXT_PUBLIC_DEMO_MODE=true` and `DEMO_MODE=true`.

---

## License

MIT
