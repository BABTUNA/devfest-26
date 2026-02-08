const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * Transcribe audio (base64-encoded) to text using ElevenLabs Speech to Text.
 * Falls back to a mock response when no API key is configured.
 */
export async function runSpeechToText(
  audioBase64: string,
  language?: string,
): Promise<string> {
  if (!audioBase64.trim()) return '';

  if (!ELEVENLABS_API_KEY) {
    return '[Mock] No ELEVENLABS_API_KEY set. Set it to transcribe audio with ElevenLabs.';
  }

  // Convert base64 to a Blob for the multipart form upload
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });

  const form = new FormData();
  form.append('file', blob, 'audio.mp3');
  form.append('model_id', 'scribe_v1');
  if (language) {
    form.append('language_code', language);
  }

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs STT API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
