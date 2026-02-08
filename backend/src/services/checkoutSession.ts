export type CheckoutSessionOptions = {
  successUrl: string;
  cancelUrl: string;
  outputName?: string;
  outputMetadata?: Record<string, string | number | boolean>;
};

export type CheckoutSessionClient = {
  createCheckoutSession: (params: {
    priceSlug: string;
    successUrl: string;
    cancelUrl: string;
    outputName?: string;
    outputMetadata?: Record<string, string | number | boolean>;
  }) => Promise<unknown>;
};

export async function createCheckoutSessionFromCandidates(params: {
  client: CheckoutSessionClient;
  candidates: string[];
  options: CheckoutSessionOptions;
}): Promise<{ selectedPriceSlug: string; result: unknown }> {
  const { client, candidates, options } = params;

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const result = await client.createCheckoutSession({
        priceSlug: candidate,
        successUrl: options.successUrl,
        cancelUrl: options.cancelUrl,
        outputName: options.outputName,
        outputMetadata: options.outputMetadata,
      });
      return {
        selectedPriceSlug: candidate,
        result,
      };
    } catch (error) {
      lastError = error;
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';

      if (!message.toLowerCase().includes('not found')) {
        throw error;
      }
    }
  }

  const fallbackMessage = `Unable to create checkout session. Tried price slugs: ${candidates.join(', ')}`;
  if (lastError && typeof lastError === 'object') {
    const message = 'message' in lastError ? String((lastError as { message?: unknown }).message ?? '') : '';
    throw new Error(message ? `${fallbackMessage}. Last error: ${message}` : fallbackMessage);
  }

  throw new Error(fallbackMessage);
}
