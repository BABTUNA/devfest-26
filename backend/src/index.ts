import './load-env.js';
import express from 'express';
import cors from 'cors';
import { runBlockRouter } from './routes/run-block.js';
import { productsRouter } from './routes/products.js';
import { entitlementsRouter } from './routes/entitlements.js';
import { checkoutRouter } from './routes/checkout.js';
import { webhookRouter } from './routes/webhook.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { workflowsRouter } from './routes/workflows.js';
import { tokensRouter } from './routes/tokens.js';

const app = express();
const PORT = process.env.PORT ?? 4000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Log configuration on startup
console.log('=== Backend Configuration ===');
console.log('DEMO_MODE:', DEMO_MODE);
console.log('SUPABASE_URL set:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('============================');

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true }));

// Webhooks must be mounted before JSON parsing to preserve raw body for signature verification.
app.use('/api/webhook', webhookRouter);

app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.path}`);
  next();
});

// Supabase routes (auth, users, workflows)
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workflows', workflowsRouter);

// No Flowglad integration for marketplace - using direct purchases

app.use('/api/run-block', runBlockRouter);
app.use('/api/products', productsRouter);
app.use('/api/entitlements', entitlementsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/tokens', tokensRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
