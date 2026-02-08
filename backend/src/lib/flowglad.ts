import { FlowgladServer } from '@flowglad/server';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const SECRET_KEY = process.env.FLOWGLAD_SECRET_KEY;

// In-memory stub for hackathon demo. Replace with real DB (e.g. Supabase) for production.
const DEMO_USERS: Record<string, { email: string; name: string }> = {
  'demo-user-1': { email: 'demo@example.com', name: 'Demo User' },
};

/** Stub used when DEMO_MODE=true so we never need FLOWGLAD_SECRET_KEY. */
function createFlowgladStub(_customerExternalId: string): FlowgladServer {
  return {
    getBilling: async () => ({
      checkFeatureAccess: () => true,
      subscriptions: [] as { id: string; status: string }[],
    }),
    createUsageEvent: async () => { },
    findOrCreateCustomer: async () => ({}),
    createCheckoutSession: async () => ({ checkoutSession: null }),
  } as unknown as FlowgladServer;
}

export const flowglad = (customerExternalId: string): FlowgladServer => {
  if (DEMO_MODE) {
    console.log('[Flowglad] Using DEMO stub for customer:', customerExternalId);
    return createFlowgladStub(customerExternalId);
  }

  if (!SECRET_KEY) {
    console.error('[Flowglad] FLOWGLAD_SECRET_KEY is not set!');
    throw new Error('FLOWGLAD_SECRET_KEY environment variable is required');
  }

  console.log('[Flowglad] Initializing FlowgladServer for customer:', customerExternalId);
  console.log('[Flowglad] Using secret key:', SECRET_KEY.substring(0, 15) + '...');

  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async (externalId: string) => {
      const user = DEMO_USERS[externalId];
      if (!user) {
        return { email: `user-${externalId}@example.com`, name: `User ${externalId}` };
      }
      return user;
    },
  });
};
