import { Router } from 'express';
import { getCustomerExternalId } from '../lib/auth.js';
import { getTokenBalance, setTokenBalance, lockUser, unlockUser, isUserLocked } from '../store/tokenStore.js';
import { resetDemoEntitlements } from './checkout.js'; // Ensure this exists or reimplement if needed
import { Flowglad } from '@flowglad/node';

const debugRouter = Router();
const DEMO_MODE = process.env.DEMO_MODE === 'true';

debugRouter.post('/reset', async (req, res) => {
    // Only allow in demo or dev environments, but for this hackathon app, it's fine.
    try {
        const userId = await getCustomerExternalId(req);

        // Set tokens to 0
        setTokenBalance(userId, 0);

        // Lock the user (overrides all entitlements)
        lockUser(userId);

        // Also reset demo entitlements for good measure
        resetDemoEntitlements(userId);

        console.log(`[Debug] Hard reset for user: ${userId} - tokens: 0, locked: true`);

        res.json({
            success: true,
            message: 'Hard reset complete. Tokens set to 0, all agents locked.',
            userId,
            balance: 0,
            locked: true,
        });
    } catch (error: any) {
        console.error('[Debug] Reset failed:', error);
        res.status(500).json({ error: error.message });
    }
});

debugRouter.post('/unlock', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);

        // Unlock the user
        unlockUser(userId);

        const balance = getTokenBalance(userId);

        console.log(`[Debug] Unlocked user: ${userId}`);

        res.json({
            success: true,
            message: 'User unlocked. Entitlements restored from Flowglad.',
            userId,
            balance,
            locked: false,
        });
    } catch (error: any) {
        console.error('[Debug] Unlock failed:', error);
        res.status(500).json({ error: error.message });
    }
});

debugRouter.get('/status', async (req, res) => {
    try {
        const userId = await getCustomerExternalId(req);
        const locked = isUserLocked(userId);
        const balance = getTokenBalance(userId);

        res.json({
            userId,
            locked,
            balance
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { debugRouter };
