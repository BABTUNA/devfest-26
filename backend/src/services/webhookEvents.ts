import { supabase } from '../lib/supabase.js';

export async function reserveFlowgladWebhookEvent(
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<'new' | 'duplicate'> {
  const { error } = await supabase
    .from('flowglad_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      provider: 'flowglad',
      payload,
    });

  if (!error) {
    return 'new';
  }

  if (error.code === '23505') {
    return 'duplicate';
  }

  throw new Error(`Failed to reserve webhook event ${eventId}: ${error.message}`);
}
