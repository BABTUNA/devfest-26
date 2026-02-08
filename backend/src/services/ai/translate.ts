import { callClaude } from './claude.js';

export async function runTranslateText(
  text: string,
  targetLanguage: string,
): Promise<string> {
  if (!text.trim()) return '';
  const lang = targetLanguage.trim() || 'English';
  const result = await callClaude(
    `You are a professional translator. Translate the given text to ${lang}. Return ONLY the translated text, no preamble or explanation.`,
    `Translate this text to ${lang}:\n\n${text.slice(0, 15000)}`,
  );
  return result.trim();
}
