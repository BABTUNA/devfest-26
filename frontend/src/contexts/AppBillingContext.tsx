'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEMO_MODE, createCheckoutSession as apiCreateCheckoutSession, getEntitlementsData } from '@/lib/api';

export type AppBillingValue = {
  loaded: boolean;
  customer?: { name?: string; email?: string };
  subscriptions?: Array<{ id: string; status: string; currentPeriodEnd?: number }>;
  invoices?: Array<{ id: string; status?: string; total?: number; invoiceDate?: number; url?: string; hostedUrl?: string }>;
  billingPortalUrl?: string;
  reload?: () => void;
  errors?: unknown[];
  entitlements: Record<string, boolean>;
  entitlementsLoading: boolean;
  entitlementsError?: string;
  hasFeatureAccess: (featureSlug: string) => boolean;
  refreshEntitlements: () => Promise<void>;
  checkFeatureAccess?: (featureSlug: string) => boolean;
  createCheckoutSession?: (opts: {
    priceSlug: string;
    successUrl: string;
    cancelUrl: string;
    autoRedirect?: boolean;
  }) => Promise<unknown>;
};

const AppBillingContext = createContext<AppBillingValue>({
  loaded: false,
  entitlements: {},
  entitlementsLoading: true,
  hasFeatureAccess: () => false,
  refreshEntitlements: async () => {},
  checkFeatureAccess: () => false,
  createCheckoutSession: async () => ({}),
});

export function useAppBilling(): AppBillingValue {
  return useContext(AppBillingContext);
}

export function AppBillingRoot({ children }: { children: ReactNode }) {
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({});
  const [entitlementsLoading, setEntitlementsLoading] = useState(true);
  const [entitlementsError, setEntitlementsError] = useState<string | undefined>(undefined);
  const [subscriptions, setSubscriptions] = useState<AppBillingValue['subscriptions']>([]);
  const [billingUnavailable, setBillingUnavailable] = useState(false);

  const refreshEntitlements = useCallback(async () => {
    if (DEMO_MODE) {
      setEntitlements({});
      setSubscriptions([{ id: 'demo-subscription', status: 'active' }]);
      setEntitlementsError(undefined);
      setEntitlementsLoading(false);
      return;
    }

    setEntitlementsLoading(true);
    setEntitlementsError(undefined);

    try {
      const data = await getEntitlementsData();
      setEntitlements(data.entitlements ?? {});
      setSubscriptions(data.billing?.subscriptions ?? []);
      setBillingUnavailable(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch entitlements';
      // Keep app usable in local/dev environments if billing is unavailable.
      setEntitlementsError(message);
      setBillingUnavailable(true);
      setSubscriptions([{ id: 'fallback-subscription', status: 'active' }]);
      console.warn('Entitlements unavailable, falling back to unlocked mode:', message);
    } finally {
      setEntitlementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const hasFeatureAccess = useCallback(
    (featureSlug: string) => {
      if (DEMO_MODE || billingUnavailable) return true;
      if (!featureSlug) return false;
      return Boolean(entitlements[featureSlug]);
    },
    [entitlements, billingUnavailable]
  );

  const createCheckoutSession = useCallback(
    async (opts: { priceSlug: string; successUrl: string; cancelUrl: string; autoRedirect?: boolean }) => {
      return apiCreateCheckoutSession({
        priceSlug: opts.priceSlug,
        successUrl: opts.successUrl,
        cancelUrl: opts.cancelUrl,
      });
    },
    []
  );

  const value: AppBillingValue = useMemo(
    () => ({
      loaded: !entitlementsLoading,
      customer: { name: 'Demo user', email: 'demo@example.com' },
      subscriptions,
      invoices: [],
      billingPortalUrl: undefined,
      reload: () => {
        void refreshEntitlements();
      },
      errors: undefined,
      entitlements,
      entitlementsLoading,
      entitlementsError,
      hasFeatureAccess,
      refreshEntitlements,
      checkFeatureAccess: hasFeatureAccess,
      createCheckoutSession,
    }),
    [
      subscriptions,
      entitlements,
      entitlementsLoading,
      entitlementsError,
      hasFeatureAccess,
      refreshEntitlements,
      createCheckoutSession,
    ]
  );

  return <AppBillingContext.Provider value={value}>{children}</AppBillingContext.Provider>;
}
