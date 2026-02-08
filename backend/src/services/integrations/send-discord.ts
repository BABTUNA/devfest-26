export async function runSendDiscord(
  webhookUrl: string,
  message: string,
): Promise<string> {
  if (!webhookUrl.trim()) {
    throw new Error('Discord webhook URL is required');
  }
  if (!message.trim()) {
    throw new Error('Message is required');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });

  // Discord returns 204 No Content on success
  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${err}`);
  }

  return 'ok';
}
