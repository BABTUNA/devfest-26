import type { BlockDefinition, BlockId } from 'shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const DEMO_USER_ID = 'demo-user-1';

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  userId?: string;
};

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, userId = DEMO_USER_ID } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

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
  id?: string;
  url?: string;
};

export type RunBlockResponse = {
  success: boolean;
  outputs: Record<string, unknown>;
};

export async function getProducts(): Promise<BlockDefinition[]> {
  const data = await apiRequest<ProductResponse>('/api/products');
  return data.products ?? [];
}

export async function getEntitlements(): Promise<Record<string, boolean>> {
  const data = await apiRequest<EntitlementsResponse>('/api/entitlements');
  return data.entitlements ?? {};
}

export async function getEntitlementsData(): Promise<EntitlementsResponse> {
  return apiRequest<EntitlementsResponse>('/api/entitlements');
}

export async function createCheckoutSession(params: {
  priceSlug: string;
  priceSlugs?: string[];
  successUrl: string;
  cancelUrl: string;
  outputName?: string;
  outputMetadata?: Record<string, string | number | boolean>;
}): Promise<CheckoutResponse['checkoutSession']> {
  const data = await apiRequest<CheckoutResponse>('/api/checkout', {
    method: 'POST',
    body: params,
  });
  if (data.checkoutSession) return data.checkoutSession;
  if (data.url || data.id) {
    return { id: data.id, url: data.url };
  }
  return null;
}

export async function runBlock(params: {
  blockId: BlockId;
  inputs: Record<string, string | string[]>;
}): Promise<RunBlockResponse> {
  return apiRequest<RunBlockResponse>('/api/run-block', {
    method: 'POST',
    body: params,
  });
}
