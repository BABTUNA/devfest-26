import './load-env.js';
import express from 'express';
import cors from 'cors';
import { expressRouter } from '@flowglad/server/express';
import { flowglad } from './lib/flowglad.js';
import { getCustomerExternalId } from './lib/auth.js';
import { runBlockRouter } from './routes/run-block.js';
import { productsRouter } from './routes/products.js';
import { entitlementsRouter } from './routes/entitlements.js';
import { checkoutRouter } from './routes/checkout.js';
import { webhookRouter } from './routes/webhook.js';
import { tokensRouter } from './routes/tokens.js';
import { discountsRouter } from './routes/discounts.js';

const app = express();
const PORT = process.env.PORT ?? 4000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const FLOWGLAD_SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

// Log configuration on startup
console.log('=== Backend Configuration ===');
console.log('DEMO_MODE:', DEMO_MODE);
console.log('FLOWGLAD_SECRET_KEY set:', !!FLOWGLAD_SECRET_KEY);
console.log('FLOWGLAD_SECRET_KEY length:', FLOWGLAD_SECRET_KEY?.length ?? 0);
console.log('FLOWGLAD_SECRET_KEY prefix:', FLOWGLAD_SECRET_KEY ? `${FLOWGLAD_SECRET_KEY.substring(0, 10)}...` : 'not set');
if (!DEMO_MODE && !FLOWGLAD_SECRET_KEY) {
  console.warn('[Config] FLOWGLAD_SECRET_KEY missing and DEMO_MODE is false. Billing endpoints will fail until key is provided.');
}
console.log('============================');

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

// Flowglad: mount at /api/flowglad so frontend useBilling() can talk to it
if (!DEMO_MODE) {
  console.log('[Setup] Mounting Flowglad expressRouter at /api/flowglad');
  app.use(
    '/api/flowglad',
    expressRouter({
      flowglad,
      getCustomerExternalId: async (req) => {
        const externalId = await getCustomerExternalId(req);
        console.log(`[Flowglad] CustomerExternalId: ${externalId}`);
        return externalId;
      },
    })
  );
} else {
  console.log('[Setup] Using demo mode - Flowglad stub');
  // In demo mode, return mock responses
  app.use('/api/flowglad', (req, res) => {
    console.log(`[Flowglad/Demo] ${req.method} ${req.url}`);
    res.json({
      billing: {
        customer: { name: 'Demo User', email: 'demo@example.com' },
        subscriptions: [],
        invoices: [],
      },
    });
  });
}

app.use('/api/run-block', runBlockRouter);
app.use('/api/products', productsRouter);
app.use('/api/entitlements', entitlementsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/discounts', discountsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
