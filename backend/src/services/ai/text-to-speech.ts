const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

export async function runTextToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
): Promise<string> {
  if (!text.trim()) return '';

  if (!ELEVENLABS_API_KEY) {
    return '[Mock] No ELEVENLABS_API_KEY set. Set it to use ElevenLabs TTS.';
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs API error: ${res.status} ${err}`);
  }

  // Response is audio bytes — convert to base64
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}
