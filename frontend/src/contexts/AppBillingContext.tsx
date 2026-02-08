'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createCheckoutSession as apiCreateCheckoutSession, getEntitlementsData } from '@/lib/api';

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

  const refreshEntitlements = useCallback(async () => {
    setEntitlementsLoading(true);
    setEntitlementsError(undefined);

    try {
      const data = await getEntitlementsData();
      setEntitlements(data.entitlements ?? {});
      setSubscriptions(data.billing?.subscriptions ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch entitlements';
      // Keep app usable — set error but don't crash. Paid blocks remain locked.
      setEntitlementsError(message);
      setEntitlements({});
      setSubscriptions([]);
      console.warn('Entitlements unavailable; paid blocks remain locked:', message);
    } finally {
      setEntitlementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const hasFeatureAccess = useCallback(
    (featureSlug: string) => {
      if (!featureSlug) return false;
      if (featureSlug === 'free') return true;
      return Boolean(entitlements[featureSlug]);
    },
    [entitlements]
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
