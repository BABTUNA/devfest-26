import type { BlockDefinition, BlockId } from 'shared';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
};

async function apiFetch<T>(path: string, options: ApiOptions = {}, hasRetried = false): Promise<T> {
  const { method = 'GET', body } = options;
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (response.status === 401 && !hasRetried) {
    try {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        return apiFetch<T>(path, options, true);
      }
    } catch {
      // Fall through and return the original unauthorized response error.
    }
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = {};
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `Request failed: ${response.status}`;
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json as T;
}

export type ProductResponse = {
  products: BlockDefinition[];
};

export type EntitlementsResponse = {
  entitlements: Record<string, boolean>;
  billing?: {
    subscriptions?: Array<{ id: string; status: string; currentPeriodEnd?: number }>;
  };
};

export type CheckoutResponse = {
  checkoutSession?: {
    id?: string;
    url?: string;
  } | null;
};

export type RunBlockResponse = {
  success: boolean;
  outputs: Record<string, unknown>;
};

export async function getProducts(): Promise<BlockDefinition[]> {
  const data = await apiFetch<ProductResponse>('/api/products');
  return data.products ?? [];
}

export async function getEntitlements(): Promise<Record<string, boolean>> {
  const data = await apiFetch<EntitlementsResponse>('/api/entitlements');
  return data.entitlements ?? {};
}

export async function getEntitlementsData(): Promise<EntitlementsResponse> {
  return apiFetch<EntitlementsResponse>('/api/entitlements');
}

export async function createCheckoutSession(params: {
  priceSlug: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResponse['checkoutSession']> {
  const data = await apiFetch<CheckoutResponse>('/api/checkout', {
    method: 'POST',
    body: params,
  });
  return data.checkoutSession;
}

export async function runBlock(params: {
  blockId: BlockId;
  inputs: Record<string, string | string[]>;
}): Promise<RunBlockResponse> {
  return apiFetch<RunBlockResponse>('/api/run-block', {
    method: 'POST',
    body: params,
  });
}
