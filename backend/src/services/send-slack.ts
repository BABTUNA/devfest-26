/**
 * Send a message to Slack via Incoming Webhooks.
 * POST { "text": "message" } to the webhook URL.
 */
export async function sendSlack(webhookUrl: string, message: string): Promise<{ status: string }> {
  const url = webhookUrl.trim();
  if (!url || !url.startsWith('https://')) {
    throw new Error(
      'Slack Webhook URL is missing or invalid. Configure it in the block settings (double-click the block).'
    );
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${err}`);
  }
  return { status: 'ok' };
}
