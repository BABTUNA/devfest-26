import { Flowglad } from '@flowglad/node';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;
const PRICING_MODEL_ID = process.env.FLOWGLAD_PRICING_MODEL_ID;

if (!SECRET_KEY || !PRICING_MODEL_ID) {
    console.error('Missing FLOWGLAD_SECRET_KEY or FLOWGLAD_PRICING_MODEL_ID');
    process.exit(1);
}

const flowglad = new Flowglad({ apiKey: SECRET_KEY });

const COUPONS = [
    { code: 'SUMMARIZE25', name: 'Summarize Power User', amount: 25 },
    { code: 'EMAILS25', name: 'Email Extractor Deal', amount: 25 },
    { code: 'REWRITE25', name: 'Prompt Engineering Discount', amount: 25 },
    { code: 'CLASSIFY25', name: 'Classifier Pro Offer', amount: 25 },
];

async function seedCoupons() {
    console.log('🌱 Seeding discount coupons...');

    for (const coupon of COUPONS) {
        try {
            console.log(`Creating/Updating coupon: ${coupon.code}`);

            // We can't easily check for existence by code without listing all.
            // Easiest path for script is to try create, ignore if exists (or rely on unique constraint error)
            // Actually, Flowglad create throws if code exists.

            try {
                await flowglad.discounts.create({
                    discount: {
                        name: coupon.name,
                        code: coupon.code,
                        amount: coupon.amount,
                        amountType: 'percent',
                        duration: 'forever', // or 'once'
                        pricingModelId: PRICING_MODEL_ID,
                        active: true,
                    }
                });
                console.log(`✅ Created ${coupon.code}`);
            } catch (err: any) {
                // If error is about duplicate code, that's fine, we skip.
                if (err?.message?.includes('code already exists') || err?.status === 409) {
                    console.log(`ℹ️  Coupon ${coupon.code} already exists.`);
                } else {
                    console.error(`❌ Failed to create ${coupon.code}:`, err.message);
                }
            }

        } catch (error) {
            console.error('Unexpected error:', error);
        }
    }

    console.log('✨ Seed complete!');
}

seedCoupons();
