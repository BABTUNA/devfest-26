import { Router } from 'express';
import { Flowglad } from '@flowglad/node';

const discountsRouter = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;
const PRICING_MODEL_ID = process.env.FLOWGLAD_PRICING_MODEL_ID;

// Initialize Flowglad client with API Key (not secretKey property name)
// In a real app, this might share the client instance from lib/flowglad.ts, 
// but since that one uses FlowgladServer and this needs resource access, we init a new node client.
const flowglad = SECRET_KEY ? new Flowglad({ apiKey: SECRET_KEY }) : null;

discountsRouter.post('/', async (req, res) => {
    if (DEMO_MODE) {
        return res.json({
            success: true,
            message: 'Demo mode: Coupon simulated.',
            discount: {
                code: (req.body.code ?? 'DEMO25').toUpperCase(),
                amount: 25
            }
        });
    }

    if (!flowglad || !PRICING_MODEL_ID) {
        console.error('[Discounts] Missing configuration');
        return res.status(500).json({ error: 'Backend configuration error' });
    }

    try {
        const { name, code, amount = 25 } = req.body;

        if (!code || !name) {
            return res.status(400).json({ error: 'Name and code are required' });
        }

        const discountResponse = await flowglad.discounts.create({
            discount: {
                name,
                code: code.toUpperCase(), // Ensure uppercase
                amount,
                amountType: 'percent',
                duration: 'forever',
                pricingModelId: PRICING_MODEL_ID,
                active: true,
            }
        });

        console.log(`[Discounts] Created coupon: ${code}`);

        res.json({
            success: true,
            discount: discountResponse.discount
        });

    } catch (error: any) {
        console.error('[Discounts] Failed to create coupon:', error);
        // Handle duplicate code error gracefully
        if (error?.message?.includes('code already exists') || error?.status === 409) {
            return res.status(409).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: error.message || 'Failed to create discount' });
    }
});

export { discountsRouter };
