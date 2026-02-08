import { Router } from 'express';
import { BLOCK_DEFINITIONS } from 'shared';
import { getCustomerExternalId } from '../lib/auth.js';

export const productsRouter = Router();

const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

// Get the default pricing model ID from env or use a fallback
const PRICING_MODEL_ID = process.env.FLOWGLAD_PRICING_MODEL_ID || 'pricing_model_fDYzbCCeVKczlBpCLDEPC';

// GET /api/products - List all products (static blocks + dynamic from Flowglad)
productsRouter.get('/', async (_req, res) => {
  try {
    // First, return the static block definitions
    const staticProducts = BLOCK_DEFINITIONS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      featureSlug: b.featureSlug,
      priceSlug: b.priceSlug,
      usageMeterSlug: b.usageMeterSlug,
      usesAI: b.usesAI,
      inputs: b.inputs,
      outputs: b.outputs,
      source: 'static',
    }));

    // Optionally fetch dynamic products from Flowglad
    let dynamicProducts: unknown[] = [];
    if (FLOWGLAD_SECRET_KEY) {
      try {
        const flowgladRes = await fetch(`${FLOWGLAD_API_URL}/products`, {
          method: 'GET',
          headers: {
            'Authorization': FLOWGLAD_SECRET_KEY,
            'Content-Type': 'application/json',
          },
        });
        if (flowgladRes.ok) {
          const data = await flowgladRes.json() as {
            products?: Array<{
              id: string;
              name: string;
              slug: string;
              description?: string;
              imageURL?: string;
            }>
          };

          // Filter out static block slugs to avoid duplicates
          const staticSlugs = new Set(BLOCK_DEFINITIONS.map(b => b.priceSlug));

          dynamicProducts = (data.products || [])
            .filter(p => !staticSlugs.has(p.slug))
            .map((p) => ({
              // Normalize to BlockDefinition-like structure
              id: p.slug || p.id,
              name: p.name,
              description: p.description || 'User-created agent',
              icon: 'Sparkles', // Default icon for user-created agents
              featureSlug: p.slug || p.id,
              priceSlug: p.slug || p.id,
              usageMeterSlug: undefined,
              usesAI: true,
              tokenCost: 1,
              inputs: [{ key: 'input', label: 'Input', type: 'text', required: true }],
              outputs: [{ key: 'output', label: 'Output' }],
              source: 'flowglad',
              imageURL: p.imageURL,
            }));

          console.log(`[Products] Fetched ${dynamicProducts.length} dynamic products from Flowglad`);
        }
      } catch (e) {
        console.error('[Products] Failed to fetch from Flowglad:', e);
      }
    }

    res.json({
      products: [...staticProducts, ...dynamicProducts],
    });
  } catch (e) {
    console.error('[Products] Error listing products:', e);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// POST /api/products - Create a new product in Flowglad
productsRouter.post('/', async (req, res) => {
  try {
    const userId = await getCustomerExternalId(req);
    const {
      name,
      slug,
      description,
      priceInCents = 500, // Default to $5.00
      imageURL,
    } = req.body as {
      name: string;
      slug: string;
      description?: string;
      priceInCents?: number;
      imageURL?: string;
    };

    console.log(`[Products] Creating product: ${name} (${slug}) by user ${userId}`);

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name and slug are required',
      });
    }

    // Validate slug format (lowercase, alphanumeric, underscores)
    if (!/^[a-z0-9_]+$/.test(slug)) {
      return res.status(400).json({
        error: 'Invalid slug format',
        details: 'Slug must be lowercase alphanumeric with underscores only',
      });
    }

    if (!FLOWGLAD_SECRET_KEY) {
      return res.status(500).json({
        error: 'Flowglad not configured',
        details: 'FLOWGLAD_SECRET_KEY is not set',
      });
    }

    // Create product in Flowglad
    const flowgladPayload = {
      product: {
        name,
        slug,
        description: description || '',
        imageURL: imageURL || '',
        pricingModelId: PRICING_MODEL_ID,
        active: true,
        default: false,
      },
      price: {
        type: 'single_payment',
        name: `${name} Price`,
        slug: slug, // Use same slug for price
        unitPrice: priceInCents,
        active: true,
        isDefault: true,
        intervalUnit: null,
        intervalCount: null,
        trialPeriodDays: null,
        usageEventsPerUnit: null,
        usageMeterId: null,
      },
      featureIds: [],
    };

    console.log('[Products] Flowglad payload:', JSON.stringify(flowgladPayload, null, 2));

    const flowgladRes = await fetch(`${FLOWGLAD_API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': FLOWGLAD_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowgladPayload),
    });

    const responseText = await flowgladRes.text();
    console.log('[Products] Flowglad response status:', flowgladRes.status);
    console.log('[Products] Flowglad response:', responseText);

    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!flowgladRes.ok) {
      console.error('[Products] Flowglad error:', responseData);
      return res.status(flowgladRes.status).json({
        error: 'Failed to create product in Flowglad',
        details: responseData,
      });
    }

    const product = (responseData as { product?: unknown }).product;
    console.log('[Products] Created product:', product);

    res.status(201).json({
      success: true,
      product,
      message: `Product "${name}" created successfully`,
    });
  } catch (e) {
    console.error('[Products] Error creating product:', e);
    res.status(500).json({
      error: 'Failed to create product',
      details: e instanceof Error ? e.message : String(e),
    });
  }
});

// GET /api/products/:slug - Get a specific product by slug
productsRouter.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // First check static products
    const staticProduct = BLOCK_DEFINITIONS.find(b => b.priceSlug === slug || b.id === slug);
    if (staticProduct) {
      return res.json({ product: { ...staticProduct, source: 'static' } });
    }

    // Then check Flowglad
    if (FLOWGLAD_SECRET_KEY) {
      const flowgladRes = await fetch(`${FLOWGLAD_API_URL}/products?slug=${slug}`, {
        method: 'GET',
        headers: {
          'Authorization': FLOWGLAD_SECRET_KEY,
          'Content-Type': 'application/json',
        },
      });
      if (flowgladRes.ok) {
        const data = await flowgladRes.json() as { products?: unknown[] };
        const product = (data.products || []).find((p: unknown) =>
          (p as { slug?: string }).slug === slug
        );
        if (product) {
          return res.json({ product: { ...product as object, source: 'flowglad' } });
        }
      }
    }

    res.status(404).json({ error: 'Product not found' });
  } catch (e) {
    console.error('[Products] Error getting product:', e);
    res.status(500).json({ error: 'Failed to get product' });
  }
});
