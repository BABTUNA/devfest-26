import { Router } from 'express';

export type ElevenLabsVoice = { voice_id: string; name: string };

/** Premade voices fallback when API key is not set (from ElevenLabs docs) */
const PREMADE_VOICES: ElevenLabsVoice[] = [
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
  { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
  { voice_id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew' },
  { voice_id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily' },
  { voice_id: 'D38z5RcWu1voky8WS1ja', name: 'Fin' },
  { voice_id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi' },
  { voice_id: 'zcAOhNBS3c14rBihAFp1', name: 'Giovanni' },
  { voice_id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace' },
  { voice_id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry' },
  { voice_id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James' },
  { voice_id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { voice_id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael' },
  { voice_id: 'zrHiDhphv9ZnVXBqCLjz', name: 'Mimi' },
  { voice_id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole' },
  { voice_id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick' },
  { voice_id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul' },
  { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam' },
  { voice_id: 'pMsXgVXv3BLzUgSXRplE', name: 'Serena' },
  { voice_id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas' },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill' },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris' },
  { voice_id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave' },
  { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy' },
  { voice_id: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan' },
  { voice_id: 't0jbNlBVZ17f02VDIeMI', name: 'Jessie' },
  { voice_id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph' },
  { voice_id: 'z9fAnlkpzviPz146aGWa', name: 'Glinda' },
  { voice_id: 'knrPHWnBmmDHMoiMeP3l', name: 'Santa Claus' },
];

const elevenlabsVoicesRouter = Router();

elevenlabsVoicesRouter.get('/', async (_req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.json({ voices: PREMADE_VOICES });
  }
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) {
      console.warn('[ElevenLabs] API error:', response.status, await response.text());
      return res.json({ voices: PREMADE_VOICES });
    }
    const data = (await response.json()) as { voices?: Array<{ voice_id?: string; name?: string }> };
    const voices: ElevenLabsVoice[] = (data.voices ?? []).map((v) => ({
      voice_id: v.voice_id ?? '',
      name: v.name ?? v.voice_id ?? 'Unknown',
    })).filter((v) => v.voice_id);
    return res.json({ voices: voices.length > 0 ? voices : PREMADE_VOICES });
  } catch (e) {
    console.error('[ElevenLabs] Fetch error:', e);
    return res.json({ voices: PREMADE_VOICES });
  }
});

export { elevenlabsVoicesRouter };
