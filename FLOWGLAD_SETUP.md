# Flowglad setup for Devfest

Your app uses two Flowglad concepts:

- **Price** (slug) → Used at **checkout**. When a user clicks "Unlock", the app calls `createCheckoutSession({ priceSlug })`. You must have a **Price** in your [Flowglad pricing model](https://app.flowglad.com) with that slug.
- **Feature** (slug) → Used for **access**. The app calls `checkFeatureAccess(featureSlug)` to decide if the user can run a block. The customer must have that **Feature** (usually by purchasing a product that grants it).

---

## What you already have (current pricing model)

From your `pricing-pricing_model_fDYzbCCeVKczlBpCLDEPC.yaml`:

| Slug     | Type   | Purpose in app                          |
|----------|--------|-----------------------------------------|
| **free** | Price  | Checkout for "free" blocks (no charge)  |
| **dummy5** | Price | Checkout for paid blocks ($5)         |

For **checkFeatureAccess** to work, the same slugs should exist as **Features** in Flowglad, and be granted when the customer has the corresponding product/price (e.g. buying `dummy5` grants feature `dummy5`). If your pricing model only defines products/prices and not features, add **Features** with slugs `free` and `dummy5` and attach them to the Free and dummy5 products so purchases grant access.

---

## Block → Flowglad mapping (current)

How each block in the app maps to your pricing model:

| Block            | featureSlug (access) | priceSlug (checkout) | Notes        |
|------------------|----------------------|----------------------|-------------|
| Summarize Text   | dummy5               | dummy5               | AI block    |
| Extract Emails   | dummy5               | dummy5               | AI block    |
| Rewrite Prompt   | dummy5               | dummy5               | AI block    |
| Classify Input   | dummy5               | dummy5               | AI block    |
| Merge PDFs       | dummy5               | dummy5               | AI block    |
| Trigger          | free                 | free                 | Utility     |
| Text Join        | free                 | free                 | Utility     |
| Constant         | free                 | free                 | Utility     |
| Conditional      | free                 | free                 | Utility     |

So right now: **one paid product** (`dummy5`, $5) and **one free product** (`free`, $0) cover all blocks.

---

## What to create in Flowglad (if you want per-block products)

If you want separate products (e.g. "Summarize Text" $2, "Merge PDFs" $10), do this:

1. **In [Flowglad Dashboard](https://app.flowglad.com)** (same pricing model as your API key):
   - For each **product** you want:
     - Create a **Product** (e.g. name "Summarize Text").
     - Create a **Price** with the **slug** you choose (e.g. `summarize_text`), amount and currency.
     - Create a **Feature** with the **same slug** (e.g. `summarize_text`) and attach it to that product so buying the price grants the feature.

2. **Slugs to create (example)**  
   You can use one slug per block, e.g.:

   | Product name   | Price slug (and feature slug) | Suggested type   |
   |----------------|--------------------------------|-------------------|
   | Summarize Text | `summarize_text`               | single_payment    |
   | Extract Emails| `extract_emails`               | single_payment    |
   | Rewrite Prompt| `rewrite_prompt`               | single_payment    |
   | Classify Input| `classify_input`               | single_payment    |
   | Merge PDFs    | `merge_pdfs`                   | single_payment or subscription |
   | (Free blocks) | `free`                         | $0 single_payment |

3. **Tell me the mapping**  
   Once you’ve created products/prices/features, list which **price slug** (and feature slug, if different) each block should use. I’ll update `shared/src/blocks.ts` so each block has the correct `featureSlug` and `priceSlug`.

---

## Summary

- **Minimum for current app:** Keep **free** and **dummy5** prices (and matching features) in your pricing model. No change needed if that’s already done.
- **Optional:** Add one product/price/feature per block in Flowglad, then we’ll wire each block in `shared/src/blocks.ts` to the right slugs.
