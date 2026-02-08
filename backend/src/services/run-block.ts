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
    case 'trigger': {
      return { trigger: true };
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
    case 'translate-text': {
      const text = String(inputs['text'] ?? '');
      const targetLanguage = String(inputs['targetLanguage'] ?? 'English');
      const translated = await runTranslateText(text, targetLanguage);
      return { translated };
    }
    case 'text-to-speech': {
      const text = String(inputs['text'] ?? '');
      const voiceId = String(inputs['voiceId'] ?? '');
      const audioBase64 = await runTextToSpeech(text, voiceId || undefined);
      return { audioBase64 };
    }
    case 'speech-to-text': {
      const audio = String(inputs['audioBase64'] ?? '');
      const language = String(inputs['language'] ?? '');
      const transcription = await runSpeechToText(audio, language || undefined);
      return { transcription };
    }
    case 'send-slack': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '');
      const message = String(inputs['message'] ?? inputs['text'] ?? '');
      const status = await runSendSlack(webhookUrl, message);
      return { status };
    }
    case 'send-discord': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '');
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
    }
    default:
      throw new Error(`Unimplemented block: ${blockId}`);
  }
}
