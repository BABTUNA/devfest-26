/**
 * Fetch content from a URL and return the page body, status code, and resolved URL.
 */
export async function runFetchUrl(
  url: string
): Promise<{ body: string; statusCode: number; url: string }> {
  if (!url.trim()) {
    throw new Error('URL is required for fetch-url');
  }

  // Ensure URL has a protocol
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DevFest-Bot/1.0)',
      },
      // Set a timeout
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    const statusCode = response.status;
    let body = await response.text();

    // Limit body size to prevent huge payloads (max 500KB of text)
    const MAX_BODY_SIZE = 500 * 1024; // 500KB
    if (body.length > MAX_BODY_SIZE) {
      console.warn(`[FetchURL] Body truncated from ${body.length} to ${MAX_BODY_SIZE} bytes`);
      body = body.slice(0, MAX_BODY_SIZE) + '\n\n[... content truncated ...]';
    }

    return { body, statusCode, url: targetUrl };
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError' || e.message.includes('timeout')) {
        throw new Error('Request timeout: URL took too long to respond');
      }
      if (e.message.includes('Failed to fetch') || e.message.includes('ECONNREFUSED')) {
        throw new Error(`Failed to connect to URL: ${e.message}`);
      }
      throw new Error(`Failed to fetch URL: ${e.message}`);
    }
    throw new Error(`Failed to fetch URL: ${String(e)}`);
  }
}
