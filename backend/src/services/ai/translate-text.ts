import { callClaude } from './claude.js';

export async function runTranslateText(text: string, targetLanguage: string): Promise<string> {
  if (!text.trim()) return '';
  const lang = targetLanguage.trim() || 'English';
  console.log(`[Translate] Translating ${text.length} chars into "${lang}"`);
  const result = await callClaude(
    `You are a translator. Translate the following text into ${lang}. Output ONLY the translation in ${lang}. Do not include any English text, explanations, labels, or notes. Just the translated text.`,
    `Translate this into ${lang}:\n\n${text.slice(0, 15000)}`
  );
  console.log(`[Translate] Result: "${result.slice(0, 100)}..."`);
  return result.trim();
}
