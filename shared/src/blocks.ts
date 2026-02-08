export type BlockId =
  | 'summarize-text'
  | 'extract-emails'
  | 'rewrite-prompt'
  | 'classify-input'
  | 'merge-pdfs'
  | 'trigger'
  | 'text-join'
  | 'constant'
  | 'conditional'
  | 'translate-text'
  | 'text-to-speech'
  | 'speech-to-text'
  | 'send-slack'
  | 'send-discord'
  | 'fetch-url'
  | 'audio-player'
  | 'browser-agent';

export interface BlockDefinition {
  id: BlockId;
  name: string;
  description: string;
  icon: string;
  /** Flowglad feature slug for entitlement gating */
  featureSlug: string;
  /** Flowglad price slug for checkout (usage or subscription) */
  priceSlug: string;
  /** Optional fallback price slugs (tried in order after priceSlug) */
  checkoutPriceSlugs?: string[];
  /** Flowglad usage meter slug for usage-based billing */
  usageMeterSlug?: string;
  /** Whether block uses Claude/GPT (true) or backend-only (false) */
  usesAI: boolean;
  /** Optional checkout metadata resolved from Flowglad pricing model */
  priceName?: string | null;
  /** Price per unit in smallest currency unit (e.g. cents) */
  priceUnitAmount?: number;
  priceCurrency?: string;
  priceType?: 'single_payment' | 'subscription' | 'usage';
  inputs: { key: string; label: string; type: 'text' | 'file'; required?: boolean }[];
  outputs: { key: string; label: string }[];
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    id: 'summarize-text',
    name: 'Summarize Text',
    description: 'TL;DR summary of a user-pasted document.',
    icon: 'Brain',
    featureSlug: 'summarize_text',
    priceSlug: 'summarize_text',
    checkoutPriceSlugs: ['dummy5'],
    usageMeterSlug: 'summarize_text_runs',
    usesAI: true,
    inputs: [{ key: 'text', label: 'Text to summarize', type: 'text', required: true }],
    outputs: [{ key: 'summary', label: 'Summary' }],
  },
  {
    id: 'extract-emails',
    name: 'Extract Emails',
    description: 'Extract all email addresses from raw text.',
    icon: 'Mail',
    featureSlug: 'extract_emails',
    priceSlug: 'extract_emails',
    checkoutPriceSlugs: ['dummy5'],
    usageMeterSlug: 'extract_emails_runs',
    usesAI: true,
    inputs: [{ key: 'text', label: 'Text to scan', type: 'text', required: true }],
    outputs: [{ key: 'emails', label: 'Extracted emails' }],
  },
  {
    id: 'rewrite-prompt',
    name: 'Rewrite Prompt',
    description: 'Reframe user input for clarity and structure.',
    icon: 'PenLine',
    featureSlug: 'rewrite_prompt',
    priceSlug: 'rewrite_prompt',
    checkoutPriceSlugs: ['dummy5'],
    usageMeterSlug: 'rewrite_prompt_runs',
    usesAI: true,
    inputs: [{ key: 'text', label: 'Input to rewrite', type: 'text', required: true }],
    outputs: [{ key: 'rewritten', label: 'Rewritten text' }],
  },
  {
    id: 'classify-input',
    name: 'Classify Input',
    description: 'Label text as positive, neutral, or negative.',
    icon: 'TestTube',
    featureSlug: 'classify_input',
    priceSlug: 'classify_input',
    checkoutPriceSlugs: ['dummy5'],
    usageMeterSlug: 'classify_input_runs',
    usesAI: true,
    inputs: [{ key: 'text', label: 'Text to classify', type: 'text', required: true }],
    outputs: [{ key: 'label', label: 'Sentiment' }, { key: 'confidence', label: 'Confidence' }],
  },
  {
    id: 'merge-pdfs',
    name: 'Merge PDFs',
    description: 'Merge multiple PDF files into one (subscription-only).',
    icon: 'FileStack',
    featureSlug: 'merge_pdfs',
    priceSlug: 'merge_pdfs',
    checkoutPriceSlugs: ['dummy5'],
    usesAI: false,
    inputs: [
      { key: 'files', label: 'PDF files', type: 'file', required: true },
    ],
    outputs: [{ key: 'mergedUrl', label: 'Download link' }],
  },
  // --- Workflow utility blocks (free, no billing) ---
  {
    id: 'trigger',
    name: 'Trigger',
    description: 'Start of a workflow. No inputs; outputs a signal so other blocks can depend on it.',
    icon: 'Play',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [],
    outputs: [{ key: 'trigger', label: 'Signal' }],
  },
  {
    id: 'text-join',
    name: 'Text Join',
    description: 'Combine two text inputs into one, with an optional separator.',
    icon: 'Layers',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'text1', label: 'First text', type: 'text', required: true },
      { key: 'text2', label: 'Second text', type: 'text', required: true },
      { key: 'separator', label: 'Separator (e.g. space)', type: 'text', required: false },
    ],
    outputs: [{ key: 'combined', label: 'Combined text' }],
  },
  {
    id: 'constant',
    name: 'Constant',
    description: 'Output a fixed value you type in. Use as manual input or template in a workflow.',
    icon: 'Type',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [{ key: 'value', label: 'Value', type: 'text', required: true }],
    outputs: [{ key: 'value', label: 'Value' }],
  },
  {
    id: 'conditional',
    name: 'Conditional',
    description: 'Check if text is non-empty or contains a pattern. Outputs true/false for branching.',
    icon: 'GitBranch',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'text', label: 'Text to check', type: 'text', required: true },
      { key: 'pattern', label: 'Contains (optional)', type: 'text', required: false },
    ],
    outputs: [{ key: 'match', label: 'Match result' }],
  },
  // --- New blocks ---
  {
    id: 'translate-text',
    name: 'Translate Text',
    description: 'Enter text + target language → get the translated version.',
    icon: 'Languages',
    featureSlug: 'translate_text',
    priceSlug: 'translate_text',
    checkoutPriceSlugs: ['translate_text_usage'],
    usageMeterSlug: 'translate_text_runs',
    usesAI: true,
    inputs: [
      { key: 'text', label: 'Text to translate', type: 'text', required: true },
      { key: 'targetLanguage', label: 'Target language (e.g. Spanish, French)', type: 'text', required: true },
    ],
    outputs: [{ key: 'translated', label: 'Translated text' }],
  },
  {
    id: 'text-to-speech',
    name: 'Text to Speech',
    description: 'Enter text → get an audio file of the spoken words.',
    icon: 'Volume2',
    featureSlug: 'text_to_speech',
    priceSlug: 'text_to_speech',
    checkoutPriceSlugs: ['text_to_speech_usage'],
    usageMeterSlug: 'text_to_speech_runs',
    usesAI: true,
    inputs: [
      { key: 'text', label: 'Text to speak', type: 'text', required: true },
      { key: 'voiceId', label: 'ElevenLabs Voice ID (optional)', type: 'text', required: false },
    ],
    outputs: [{ key: 'audioBase64', label: 'Audio file (base64)' }],
  },
  {
    id: 'speech-to-text',
    name: 'Speech to Text',
    description: 'Upload audio → get a text transcription of the spoken words.',
    icon: 'Mic',
    featureSlug: 'speech_to_text',
    priceSlug: 'speech_to_text',
    checkoutPriceSlugs: ['speech_to_text_usage'],
    usageMeterSlug: 'speech_to_text_runs',
    usesAI: true,
    inputs: [
      { key: 'audioBase64', label: 'Audio file (base64)', type: 'text', required: true },
      { key: 'language', label: 'Language code (e.g. en, es)', type: 'text', required: false },
    ],
    outputs: [{ key: 'transcription', label: 'Transcribed text' }],
  },
  {
    id: 'send-slack',
    name: 'Send to Slack',
    description: 'Enter a message + Slack webhook URL → message gets posted to your Slack channel.',
    icon: 'MessageSquare',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'webhookUrl', label: 'Slack Webhook URL', type: 'text', required: true },
      { key: 'message', label: 'Message to send', type: 'text', required: true },
    ],
    outputs: [{ key: 'status', label: 'Send status' }],
  },
  {
    id: 'send-discord',
    name: 'Send to Discord',
    description: 'Enter a message + Discord webhook URL → message gets posted to your Discord channel.',
    icon: 'Hash',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'webhookUrl', label: 'Discord Webhook URL', type: 'text', required: true },
      { key: 'message', label: 'Message to send', type: 'text', required: true },
    ],
    outputs: [{ key: 'status', label: 'Send status' }],
  },
  {
    id: 'fetch-url',
    name: 'Fetch URL',
    description: 'Enter a URL → get the webpage content as text.',
    icon: 'Globe2',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'url', label: 'URL to fetch', type: 'text', required: true },
    ],
    outputs: [
      { key: 'body', label: 'Page content' },
      { key: 'statusCode', label: 'HTTP status code' },
    ],
  },
  {
    id: 'audio-player',
    name: 'Audio Player',
    description: 'Play audio from base64-encoded MP3 data',
    icon: 'Volume2',
    featureSlug: 'free',
    priceSlug: 'free',
    usesAI: false,
    inputs: [
      { key: 'audioBase64', label: 'Audio data (base64)', type: 'text', required: true },
      { key: 'volume', label: 'Volume (0-100)', type: 'text', required: false },
      { key: 'autoPlay', label: 'Auto-play', type: 'text', required: false },
      { key: 'showPlayer', label: 'Show audio player controls', type: 'text', required: false },
    ],
    outputs: [{ key: 'audioBase64', label: 'Audio data' }, { key: 'played', label: 'Playback status' }],
  },
  {
    id: 'browser-agent',
    name: 'Browser Agent',
    description: 'Navigate to a URL and extract text content using a headless browser',
    icon: 'Globe2',
    featureSlug: 'browser_agent',
    priceSlug: 'browser_agent',
    checkoutPriceSlugs: ['browser_agent_usage'],
    usageMeterSlug: 'browser_agent_runs',
    usesAI: false,
    inputs: [
      { key: 'url', label: 'URL to visit', type: 'text', required: true },
      { key: 'waitForSelector', label: 'Wait for selector (optional)', type: 'text', required: false },
      { key: 'extractSelector', label: 'Extract selector (optional)', type: 'text', required: false },
    ],
    outputs: [{ key: 'text', label: 'Extracted text' }, { key: 'title', label: 'Page title' }],
  },
];

export function getBlockById(id: BlockId): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((b) => b.id === id);
}
