export async function runSendSlack(
  webhookUrl: string,
  message: string,
): Promise<string> {
  if (!webhookUrl.trim()) {
    throw new Error('Slack webhook URL is required');
  }
  if (!message.trim()) {
    throw new Error('Message is required');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${err}`);
  }

  return 'ok';
}
