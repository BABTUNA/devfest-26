import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlowgladServerAdmin } from '@flowglad/server';
import { BLOCK_DEFINITIONS } from 'shared';

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDir, '..');
const repoRoot = resolve(backendRoot, '..');
config({ path: resolve(backendRoot, '.env') });
config({ path: resolve(repoRoot, '.env') });
config({ path: resolve(backendRoot, '.env.local'), override: true });
config({ path: resolve(repoRoot, '.env.local'), override: true });

const DEFAULT_USAGE_PRICE_CENTS = Number(process.env.FLOWGLAD_USAGE_PRICE_CENTS ?? 25);
const DEFAULT_SUBSCRIPTION_PRICE_CENTS = Number(process.env.FLOWGLAD_SUBSCRIPTION_PRICE_CENTS ?? 1200);
const SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

if (!SECRET_KEY) {
  console.error('FLOWGLAD_SECRET_KEY is required to sync Flowglad config.');
  process.exit(1);
}

const admin = new FlowgladServerAdmin({
  apiKey: SECRET_KEY,
});

function asMapBySlug(items) {
  const out = new Map();
  for (const item of items) {
    if (!item.slug) continue;
    out.set(item.slug, item);
  }
  return out;
}

function makePrice(block, usageMeterId) {
  if (block.usageMeterSlug) {
    if (!usageMeterId) {
      throw new Error(`Missing usage meter for block "${block.id}"`);
    }
    return {
      type: 'usage',
      isDefault: true,
      intervalCount: 1,
      intervalUnit: 'month',
      unitPrice: DEFAULT_USAGE_PRICE_CENTS,
      usageEventsPerUnit: 1,
      usageMeterId,
      slug: block.priceSlug,
      name: `${block.name} Usage`,
    };
  }

  return {
    type: 'subscription',
    isDefault: true,
    intervalCount: 1,
    intervalUnit: 'month',
    unitPrice: DEFAULT_SUBSCRIPTION_PRICE_CENTS,
    slug: block.priceSlug,
    name: `${block.name} Subscription`,
  };
}

async function main() {
  const paidBlocks = BLOCK_DEFINITIONS.filter((block) => block.priceSlug !== 'free');
  const { pricingModel } = await admin.getDefaultPricingModel();
  const pricingModelId = pricingModel.id;

  const usageMetersBySlug = asMapBySlug(pricingModel.usageMeters ?? []);
  const productsBySlug = asMapBySlug(pricingModel.products ?? []);
  const pricesBySlug = new Map();

  for (const product of pricingModel.products ?? []) {
    for (const price of product.prices ?? []) {
      if (!price.slug) continue;
      pricesBySlug.set(price.slug, { id: price.id, productId: product.id });
    }
  }

  for (const block of paidBlocks) {
    if (pricesBySlug.has(block.priceSlug)) {
      console.log(`✓ price exists: ${block.priceSlug}`);
      continue;
    }

    let usageMeterId;
    if (block.usageMeterSlug) {
      const existingMeter = usageMetersBySlug.get(block.usageMeterSlug);
      if (existingMeter) {
        usageMeterId = existingMeter.id;
        console.log(`✓ usage meter exists: ${block.usageMeterSlug}`);
      } else {
        const createdMeter = await admin.createUsageMeter({
          usageMeter: {
            pricingModelId,
            slug: block.usageMeterSlug,
            name: `${block.name} Runs`,
            aggregationType: 'sum',
          },
        });
        usageMeterId = createdMeter.usageMeter.id;
        usageMetersBySlug.set(block.usageMeterSlug, createdMeter.usageMeter);
        console.log(`+ created usage meter: ${block.usageMeterSlug}`);
      }
    }

    const productSlug = block.featureSlug;
    const existingProduct = productsBySlug.get(productSlug);
    const price = makePrice(block, usageMeterId);

    if (existingProduct) {
      await admin.updateProduct(existingProduct.id, {
        product: {
          id: existingProduct.id,
          active: existingProduct.active,
          name: existingProduct.name,
        },
        price,
      });
      console.log(`+ added price "${block.priceSlug}" to product "${productSlug}"`);
    } else {
      const created = await admin.createProduct({
        product: {
          active: true,
          pricingModelId,
          name: block.name,
          description: block.description,
          slug: productSlug,
        },
        price,
      });
      console.log(`+ created product "${productSlug}" with price "${block.priceSlug}"`);
      productsBySlug.set(productSlug, { ...created.product });
    }
  }

  console.log('Flowglad config sync complete.');
}

main().catch((error) => {
  console.error('Failed to sync Flowglad config:', error);
  process.exit(1);
});
