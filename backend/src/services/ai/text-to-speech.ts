/**
 * Convert text to speech using ElevenLabs API
 * Returns base64-encoded audio (MP3 format)
 * TTS just reads whatever text it receives — language detection is automatic.
 */
export async function runTextToSpeech(
  text: string,
  voiceId?: string
): Promise<string> {
  if (!text.trim()) {
    throw new Error('Text is required for text-to-speech');
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set. Please configure it in backend/.env');
  }

  // Default to Rachel voice if not specified
  const targetVoiceId = voiceId?.trim() || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  console.log('[TextToSpeech] Voice:', targetVoiceId, '| Text:', text.slice(0, 80));

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TextToSpeech] ElevenLabs API error:', response.status, errorText);
      throw new Error(
        `ElevenLabs API error (${response.status}): ${errorText.slice(0, 200)}`
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    console.log('[TextToSpeech] Audio size:', audioBuffer.byteLength, 'bytes');
    return base64Audio;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(`Failed to generate speech: ${String(e)}`);
  }
}
