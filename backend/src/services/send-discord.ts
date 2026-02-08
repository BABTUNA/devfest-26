/**
 * Send a message to Discord via webhook.
 * POST { "content": "message" } to the webhook URL.
 */
export async function sendDiscord(webhookUrl: string, message: string): Promise<{ status: string }> {
  const url = webhookUrl.trim();
  if (!url || !url.startsWith('https://')) {
    throw new Error(
      'Discord Webhook URL is missing or invalid. Double-click the Discord block and add your webhook URL.'
    );
  }
  if (!message.trim()) {
    throw new Error(
      'Message is empty. Connect the Translate block output ("Translated text") to the Discord block input ("Message to send").'
    );
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message.trim() }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${err}`);
  }
  return { status: 'ok' };
}
