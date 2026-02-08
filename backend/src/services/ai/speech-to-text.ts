/**
 * Transcribe audio to text using ElevenLabs Speech-to-Text API
 */
export async function runSpeechToText(
  audioBase64: string,
  languageCode?: string
): Promise<string> {
  if (!audioBase64?.trim()) {
    throw new Error('Audio (base64) is required for speech-to-text');
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set. Please configure it in backend/.env');
  }

  try {
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (audioBuffer.length === 0) {
      throw new Error('Invalid or empty audio data');
    }

    const formData = new FormData();
    formData.append('model_id', 'scribe_v2');
    // Accept mp3 or webm (browser MediaRecorder produces webm)
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }), 'audio.webm');
    if (languageCode?.trim()) {
      formData.append('language_code', languageCode.trim());
    }

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
      signal: AbortSignal.timeout(60000), // 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SpeechToText] ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const json = (await response.json()) as { text?: string };
    return json.text ?? '';
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError' || e.message.includes('timeout')) {
        throw new Error('Transcription timeout: audio took too long to process');
      }
      throw e;
    }
    throw new Error(`Failed to transcribe audio: ${String(e)}`);
  }
}
