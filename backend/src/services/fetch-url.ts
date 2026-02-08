export async function runFetchUrl(
  url: string,
): Promise<{ body: string; statusCode: number }> {
  if (!url.trim()) {
    throw new Error('URL is required');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'AI-Block-Marketplace/1.0' },
  });

  // Read as text (cap at 50KB to avoid memory issues)
  const text = await res.text();
  const body = text.slice(0, 50_000);

  return { body, statusCode: res.status };
}
