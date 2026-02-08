import { FlowgladServer } from '@flowglad/server';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

// In-memory stub for hackathon demo. Replace with real DB (e.g. Supabase) for production.
const DEMO_USERS: Record<string, { email: string; name: string }> = {
  'demo-user-1': { email: 'demo@example.com', name: 'Demo User' },
};

/** Stub used when DEMO_MODE=true so we never need FLOWGLAD_SECRET_KEY. */
function createFlowgladStub(_customerExternalId: string) {
  return {
    getBilling: async () => ({
      checkFeatureAccess: () => true,
      subscriptions: [] as { id: string; status: string }[],
    }),
    createUsageEvent: async () => {},
    findOrCreateCustomer: async () => ({}),
    createCheckoutSession: async () => ({ checkoutSession: null }),
  };
}

export const flowglad = (customerExternalId: string) => {
  if (DEMO_MODE) {
    return createFlowgladStub(customerExternalId) as unknown as FlowgladServer;
  }
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
