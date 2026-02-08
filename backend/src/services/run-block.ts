import type { BlockId } from 'shared';
import { getBlockById } from 'shared';
import { runSummarizeText } from './ai/summarize.js';
import { runExtractEmails } from './ai/extract-emails.js';
import { runRewritePrompt } from './ai/rewrite-prompt.js';
import { runClassifyInput } from './ai/classify-input.js';
import { runMergePdfs } from './merge-pdfs.js';
import { runTranslateText } from './ai/translate.js';
import { runTextToSpeech } from './ai/text-to-speech.js';
import { runSpeechToText } from './ai/speech-to-text.js';
import { runSendSlack } from './integrations/send-slack.js';
import { runSendDiscord } from './integrations/send-discord.js';
import { runFetchUrl } from './fetch-url.js';
import { runBrowserAgent } from './browser-agent.js';

export async function runBlock(
  blockId: BlockId,
  inputs: Record<string, string | string[]>
): Promise<Record<string, unknown>> {
  const block = getBlockById(blockId);
  if (!block) throw new Error(`Unknown block: ${blockId}`);

  switch (blockId) {
    case 'summarize-text': {
      const text = String(inputs['text'] ?? '');
      const summary = await runSummarizeText(text);
      return { summary };
    }
    case 'extract-emails': {
      const text = String(inputs['text'] ?? '');
      const emails = await runExtractEmails(text);
      return { emails: emails.join(', ') };
    }
    case 'rewrite-prompt': {
      const text = String(inputs['text'] ?? '');
      const rewritten = await runRewritePrompt(text);
      return { rewritten };
    }
    case 'classify-input': {
      const text = String(inputs['text'] ?? '');
      const { label, confidence } = await runClassifyInput(text);
      return { label, confidence };
    }
    case 'merge-pdfs': {
      const files = inputs['files'];
      const mergedPdf = await runMergePdfs(Array.isArray(files) ? files : files ? [files] : []);
      return { mergedPdf };
    }
    case 'text-join': {
      const text1 = String(inputs['text1'] ?? '').trim();
      const text2 = String(inputs['text2'] ?? '').trim();
      const separator = String(inputs['separator'] ?? ' ').trim() || ' ';
      const combined = [text1, text2].filter(Boolean).join(separator);
      return { combined };
    }
    case 'constant': {
      const value = String(inputs['value'] ?? '');
      return { value };
    }
    case 'conditional': {
      const text = String(inputs['text'] ?? '').trim();
      const pattern = String(inputs['pattern'] ?? '').trim();
      const match = pattern ? text.includes(pattern) : text.length > 0;
      return { match };
    }
<<<<<<< HEAD
    case 'translate-text': {
      const text = String(inputs['text'] ?? '');
      const targetLanguage = String(inputs['targetLanguage'] ?? 'English');
      const translated = await runTranslateText(text, targetLanguage);
=======
    // --- New blocks ---
    case 'translate-text': {
      const text = String(inputs['text'] ?? '');
      const targetLanguage = String(inputs['targetLanguage'] ?? 'Spanish');
      // Use OpenAI/Claude for translation
      const translated = await translateText(text, targetLanguage);
>>>>>>> main
      return { translated };
    }
    case 'text-to-speech': {
      const text = String(inputs['text'] ?? '');
      const voiceId = String(inputs['voiceId'] ?? '');
<<<<<<< HEAD
      const audioBase64 = await runTextToSpeech(text, voiceId || undefined);
      return { audioBase64 };
    }
    case 'speech-to-text': {
      const audio = String(inputs['audioBase64'] ?? '');
      const language = String(inputs['language'] ?? '');
      const transcription = await runSpeechToText(audio, language || undefined);
=======
      // Use ElevenLabs API for TTS
      const audioBase64 = await textToSpeech(text, voiceId);
      return { audioBase64 };
    }
    case 'speech-to-text': {
      const audioBase64 = String(inputs['audioBase64'] ?? '');
      const language = String(inputs['language'] ?? 'en');
      // Use Whisper API for STT
      const transcription = await speechToText(audioBase64, language);
>>>>>>> main
      return { transcription };
    }
    case 'send-slack': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '');
<<<<<<< HEAD
      const message = String(inputs['message'] ?? inputs['text'] ?? '');
      const status = await runSendSlack(webhookUrl, message);
=======
      const message = String(inputs['message'] ?? '');
      const status = await sendSlackMessage(webhookUrl, message);
>>>>>>> main
      return { status };
    }
    case 'send-discord': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '');
<<<<<<< HEAD
      const message = String(inputs['message'] ?? inputs['text'] ?? '');
      const status = await runSendDiscord(webhookUrl, message);
      return { status };
    }
    case 'fetch-url': {
      const url = String(inputs['url'] ?? inputs['text'] ?? '');
      const { body, statusCode } = await runFetchUrl(url);
      return { body, statusCode };
    }
    case 'audio-player': {
      // Audio player is handled client-side only
      const audioBase64 = String(inputs['audioBase64'] ?? '');
      return { audioBase64, played: false };
    }
    case 'browser-agent': {
      const url = String(inputs['url'] ?? '');
      const waitForSelector = inputs['waitForSelector'] ? String(inputs['waitForSelector']) : undefined;
      const extractSelector = inputs['extractSelector'] ? String(inputs['extractSelector']) : undefined;
      const result = await runBrowserAgent({ url, waitForSelector, extractSelector });
      return { text: result.text, title: result.title, success: result.success };
=======
      const message = String(inputs['message'] ?? '');
      const status = await sendDiscordMessage(webhookUrl, message);
      return { status };
    }
    case 'fetch-url': {
      const url = String(inputs['url'] ?? '');
      const { body, statusCode } = await fetchUrl(url);
      return { body, statusCode };
    }
    case 'audio-player': {
      // Audio player is frontend-only, just pass through the data
      const audioBase64 = String(inputs['audioBase64'] ?? '');
      return { audioBase64, played: 'ready' };
    }
    case 'browser-agent': {
      const url = String(inputs['url'] ?? '');
      const waitForSelector = String(inputs['waitForSelector'] ?? '');
      const extractSelector = String(inputs['extractSelector'] ?? '');
      const { text, title } = await browserAgent(url, waitForSelector, extractSelector);
      return { text, title };
>>>>>>> main
    }
    default:
      throw new Error(`Unimplemented block: ${blockId}`);
  }
}

// --- Helper functions for new blocks ---

async function translateText(text: string, targetLanguage: string): Promise<string> {
  // Mock translation - in real app, use OpenAI/Claude API
  if (!text.trim()) return '';
  // Simulated translation
  return `[${targetLanguage}] ${text}`;
}

async function textToSpeech(text: string, _voiceId: string): Promise<string> {
  // Mock TTS - in real app, use ElevenLabs API
  if (!text.trim()) return '';
  // Return empty base64 as placeholder
  return 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAABCxAgAEABAAZGF0YQAAAAA='; // Silent WAV
}

async function speechToText(audioBase64: string, _language: string): Promise<string> {
  // Mock STT - in real app, use Whisper API
  if (!audioBase64.trim()) return '';
  return '[Transcription placeholder - integrate with Whisper API]';
}

async function sendSlackMessage(webhookUrl: string, message: string): Promise<string> {
  if (!webhookUrl || !message) return 'error: missing webhook URL or message';
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    return res.ok ? 'sent' : `error: ${res.status}`;
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}

async function sendDiscordMessage(webhookUrl: string, message: string): Promise<string> {
  if (!webhookUrl || !message) return 'error: missing webhook URL or message';
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
    return res.ok ? 'sent' : `error: ${res.status}`;
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}

async function fetchUrl(url: string): Promise<{ body: string; statusCode: number }> {
  if (!url) return { body: '', statusCode: 0 };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Handi-BlockRunner/1.0' },
    });
    const body = await res.text();
    return { body: body.slice(0, 10000), statusCode: res.status }; // Limit to 10k chars
  } catch (e) {
    return { body: `Error: ${e instanceof Error ? e.message : 'unknown'}`, statusCode: 0 };
  }
}

async function browserAgent(url: string, _waitForSelector: string, _extractSelector: string): Promise<{ text: string; title: string }> {
  // Mock browser agent - in real app, use Puppeteer or Playwright
  if (!url) return { text: '', title: '' };
  // For now, just use fetch to get the page content
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await res.text();
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    // Strip HTML tags for text
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
    return { text, title };
  } catch (e) {
    return { text: `Error: ${e instanceof Error ? e.message : 'unknown'}`, title: 'Error' };
  }
}
