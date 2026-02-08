import type { BlockId } from 'shared';
import { getBlockById } from 'shared';
import { runSummarizeText } from './ai/summarize.js';
import { runExtractEmails } from './ai/extract-emails.js';
import { runRewritePrompt } from './ai/rewrite-prompt.js';
import { runClassifyInput } from './ai/classify-input.js';
import { runTranslateText } from './ai/translate-text.js';
import { runTextToSpeech } from './ai/text-to-speech.js';
import { runSpeechToText } from './ai/speech-to-text.js';
import { runMergePdfs } from './merge-pdfs.js';
import { runFetchUrl } from './fetch-url.js';
import { sendSlack } from './send-slack.js';
import { sendDiscord } from './send-discord.js';

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
      const mergedUrl = await runMergePdfs(Array.isArray(files) ? files : files ? [files] : []);
      return { mergedUrl };
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
    case 'text-to-speech': {
      const text = String(inputs['text'] ?? '').trim();
      const voiceId = String(inputs['voiceId'] ?? '').trim() || undefined;
      try {
        const audioBase64 = await runTextToSpeech(text, voiceId);
        return { audioBase64 };
      } catch (e) {
        console.error('[RunBlock] Text-to-speech error:', e);
        throw e;
      }
    }
    case 'fetch-url': {
      const url = String(inputs['url'] ?? '').trim();
      const { body, statusCode, url: resolvedUrl } = await runFetchUrl(url);
      return { body, statusCode, url: resolvedUrl };
    }
    case 'speech-to-text': {
      const audioBase64 = String(inputs['audioBase64'] ?? '').trim();
      const language = String(inputs['language'] ?? '').trim() || undefined;
      const transcription = await runSpeechToText(audioBase64, language);
      return { transcription };
    }
    case 'translate-text': {
      const text = String(inputs['text'] ?? '').trim();
      const targetLanguage = String(inputs['targetLanguage'] ?? 'English').trim();
      const translated = await runTranslateText(text, targetLanguage);
      return { translated };
    }
    case 'send-slack': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '').trim();
      const message = String(inputs['message'] ?? '').trim();
      const { status } = await sendSlack(webhookUrl, message);
      return { status };
    }
    case 'send-discord': {
      const webhookUrl = String(inputs['webhookUrl'] ?? '').trim();
      const message = String(inputs['message'] ?? '').trim();
      console.log('[RunBlock] send-discord inputs:', {
        webhookUrlLooksValid: !!webhookUrl && webhookUrl.startsWith('https://'),
        webhookUrlLength: webhookUrl.length,
        messageLength: message.length,
      });
      const { status } = await sendDiscord(webhookUrl, message);
      return { status };
    }
    default:
      throw new Error(`Unimplemented block: ${blockId}`);
  }
}
