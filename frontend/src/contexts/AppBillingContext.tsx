'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEMO_MODE, createCheckoutSession as apiCreateCheckoutSession, getEntitlementsData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const { ready, isAuthenticated, user } = useAuth();
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

    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      setEntitlements({});
      setSubscriptions([]);
      setBillingUnavailable(false);
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
      const status =
        typeof error === 'object' && error && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : undefined;

      setEntitlementsError(message);
      setEntitlements({});

      if (status === 401 || status === 403) {
        setBillingUnavailable(false);
        setSubscriptions([]);
        return;
      }

      // Keep app usable in local/dev environments if billing is unavailable.
      setBillingUnavailable(true);
      setSubscriptions([{ id: 'fallback-subscription', status: 'active' }]);
      console.warn('Entitlements unavailable, falling back to unlocked mode:', message);
    } finally {
      setEntitlementsLoading(false);
    }
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!ready) return;
    void refreshEntitlements();
  }, [ready, refreshEntitlements]);

  const hasFeatureAccess = useCallback(
    (featureSlug: string) => {
      if (DEMO_MODE) return true;
      if (!isAuthenticated) return false;
      if (billingUnavailable) return true;
      if (!featureSlug) return false;
      return Boolean(entitlements[featureSlug]);
    },
    [entitlements, billingUnavailable, isAuthenticated]
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
      customer: user
        ? {
            name:
              (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : undefined) ??
              user.email?.split('@')[0],
            email: user.email,
          }
        : undefined,
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
      user,
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
