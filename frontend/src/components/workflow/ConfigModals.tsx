'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { NodeConfig } from '@/types/workflowTypes';

// ══════════════════════════════════════════════════════
//  Shared modal chrome
// ══════════════════════════════════════════════════════
function ModalShell({
  title,
  onClose,
  children,
  onSave,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
        <div className="flex gap-2 border-t border-zinc-700 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none';

// ══════════════════════════════════════════════════════
//  Text Contains condition
// ══════════════════════════════════════════════════════
function TextContainsConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [pattern, setPattern] = useState((config.pattern as string) ?? '');
  const [caseSensitive, setCaseSensitive] = useState((config.caseSensitive as boolean) ?? false);
  const [maxIterations, setMaxIterations] = useState((config.maxIterations as number) ?? 0);
  return (
    <ModalShell title="Configure: Text Contains" onClose={onClose} onSave={() => onSave({ pattern, caseSensitive, ...(maxIterations > 0 ? { maxIterations } : {}) })}>
      <Field label="Pattern to match" hint="Exact substring or regex pattern">
        <input className={inputCls} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="e.g. @gmail.com" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="accent-sky-500" />
        Case sensitive
      </label>
      <Field label="Max loop iterations" hint="If this node is inside a feedback loop, how many times to iterate before stopping (0 = default 10)">
        <input type="number" className={inputCls} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} min={0} max={100} placeholder="0" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Confidence Check condition
// ══════════════════════════════════════════════════════
function ConfidenceCheckConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [threshold, setThreshold] = useState((config.threshold as number) ?? 70);
  const [maxIterations, setMaxIterations] = useState((config.maxIterations as number) ?? 0);
  return (
    <ModalShell title="Configure: Confidence Check" onClose={onClose} onSave={() => onSave({ threshold, ...(maxIterations > 0 ? { maxIterations } : {}) })}>
      <Field label={`Minimum confidence: ${threshold}%`} hint="Skip downstream if confidence is below this threshold">
        <input
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
      </Field>
      <Field label="Max loop iterations" hint="If this node is inside a feedback loop, how many times to iterate before stopping (0 = default 10)">
        <input type="number" className={inputCls} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} min={0} max={100} placeholder="0" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Webhook action
// ══════════════════════════════════════════════════════
function WebhookConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [url, setUrl] = useState((config.url as string) ?? '');
  const [method, setMethod] = useState((config.method as string) ?? 'POST');
  return (
    <ModalShell title="Configure: Webhook" onClose={onClose} onSave={() => onSave({ url, method })}>
      <Field label="URL" hint="Endpoint that will receive the workflow output as JSON body">
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" />
      </Field>
      <Field label="HTTP Method">
        <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="GET">GET - Fetch data</option>
          <option value="POST">POST - Create/send data</option>
          <option value="PUT">PUT - Replace data</option>
          <option value="PATCH">PATCH - Update data</option>
          <option value="DELETE">DELETE - Remove data</option>
        </select>
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Send Email action
// ══════════════════════════════════════════════════════
function SendEmailConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [to, setTo] = useState((config.to as string) ?? '');
  const [subject, setSubject] = useState((config.subject as string) ?? '');
  const [body, setBody] = useState((config.body as string) ?? '');
  return (
    <ModalShell title="Configure: Send Email" onClose={onClose} onSave={() => onSave({ to, subject, body })}>
      <Field label="Recipient">
        <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="user@example.com" />
      </Field>
      <Field label="Subject">
        <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="AI Block Result" />
      </Field>
      <Field label="Body" hint="Use {{output}} to include the block output">
        <textarea className={inputCls + ' resize-none'} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Result: {{output}}" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Constant / AI block input config
// ══════════════════════════════════════════════════════
function ConstantConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [value, setValue] = useState((config.value as string) ?? '');
  return (
    <ModalShell title="Configure: Constant Value" onClose={onClose} onSave={() => onSave({ value })}>
      <Field label="Value" hint="This text will be passed as input to connected blocks">
        <textarea className={inputCls + ' resize-none'} rows={4} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter text here…" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Generic AI block config (set the primary text input)
// ══════════════════════════════════════════════════════
function AIBlockConfig({
  config,
  onSave,
  onClose,
  label,
  inputLabel = 'Input text',
  hint = 'Leave blank if this input comes from a connected upstream block',
  placeholder = 'Enter text…'
}: {
  config: NodeConfig;
  onSave: (c: NodeConfig) => void;
  onClose: () => void;
  label: string;
  inputLabel?: string;
  hint?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState((config.text as string) ?? '');
  return (
    <ModalShell title={`Configure: ${label}`} onClose={onClose} onSave={() => onSave({ text })}>
      <Field label={inputLabel} hint={hint}>
        <textarea className={inputCls + ' resize-none'} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      </Field>
    </ModalShell>
  );
}


// ══════════════════════════════════════════════════════
//  Trigger config (text / value)
// ══════════════════════════════════════════════════════
function TriggerConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [text, setText] = useState((config.text as string) ?? '');
  return (
    <ModalShell title="Configure: Trigger" onClose={onClose} onSave={() => onSave({ text, value: text })}>
      <Field label="Input text" hint="The text that will be sent to the first connected block">
        <textarea className={inputCls + ' resize-none'} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter trigger text…" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Translate Text config
// ══════════════════════════════════════════════════════
function TranslateTextConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [text, setText] = useState((config.text as string) ?? '');
  const [targetLanguage, setTargetLanguage] = useState((config.targetLanguage as string) ?? '');
  return (
    <ModalShell title="Configure: Translate Text" onClose={onClose} onSave={() => onSave({ text, targetLanguage })}>
      <Field label="Input text" hint="Leave blank if this comes from an upstream block">
        <textarea className={inputCls + ' resize-none'} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to translate…" />
      </Field>
      <Field label="Target language" hint="e.g. Spanish, French, Japanese">
        <input className={inputCls} value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} placeholder="Spanish" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Text to Speech config
// ══════════════════════════════════════════════════════
const VOICE_OPTIONS = [
  { id: '', label: 'Default Voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Rachel (Female, Calm)' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (Female, Narrative)' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam (Male, Deep)' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam (Male, Conversational)' },
  { id: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie (Male, Casual)' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte (Female, Swedish)' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Female, British)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Male, British)' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Male, American)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum (Male, Transatlantic)' },
];

function TextToSpeechConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [text, setText] = useState((config.text as string) ?? '');
  const [voiceId, setVoiceId] = useState((config.voiceId as string) ?? '');
  return (
    <ModalShell title="Configure: Text to Speech" onClose={onClose} onSave={() => onSave({ text, voiceId })}>
      <Field label="Input text" hint="Leave blank if this comes from an upstream block">
        <textarea className={inputCls + ' resize-none'} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to speak…" />
      </Field>
      <Field label="Voice" hint="Select a voice for the spoken audio">
        <select className={inputCls} value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
          {VOICE_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Speech to Text config
// ══════════════════════════════════════════════════════
const LANGUAGE_OPTIONS = [
  { code: '', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ru', label: 'Russian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
];

function SpeechToTextConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [audioBase64, setAudioBase64] = useState((config.audioBase64 as string) ?? '');
  const [language, setLanguage] = useState((config.language as string) ?? '');
  return (
    <ModalShell title="Configure: Speech to Text" onClose={onClose} onSave={() => onSave({ audioBase64, language })}>
      <Field label="Audio (base64)" hint="Leave blank if this comes from an upstream block">
        <textarea className={inputCls + ' resize-none'} rows={3} value={audioBase64} onChange={(e) => setAudioBase64(e.target.value)} placeholder="Paste base64 audio…" />
      </Field>
      <Field label="Language" hint="Select the spoken language (auto-detect if unsure)">
        <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGE_OPTIONS.map(opt => (
            <option key={opt.code} value={opt.code}>{opt.label}</option>
          ))}
        </select>
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Fetch URL config
// ══════════════════════════════════════════════════════
function FetchUrlConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [url, setUrl] = useState((config.url as string) ?? '');
  return (
    <ModalShell title="Configure: Fetch URL" onClose={onClose} onSave={() => onSave({ url })}>
      <Field label="URL" hint="The URL to fetch content from">
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Send to Slack config
// ══════════════════════════════════════════════════════
function SendSlackConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState((config.webhookUrl as string) ?? '');
  const [message, setMessage] = useState((config.message as string) ?? '');
  return (
    <ModalShell title="Configure: Send to Slack" onClose={onClose} onSave={() => onSave({ webhookUrl, message })}>
      <Field label="Slack Webhook URL" hint="Get this from your Slack workspace settings">
        <input className={inputCls} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
      </Field>
      <Field label="Custom Message (optional)" hint="Leave blank to automatically send the output from the previous block">
        <textarea className={inputCls + ' resize-none'} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional: override with custom message…" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Send to Discord config
// ══════════════════════════════════════════════════════
function SendDiscordConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState((config.webhookUrl as string) ?? '');
  const [message, setMessage] = useState((config.message as string) ?? '');
  return (
    <ModalShell title="Configure: Send to Discord" onClose={onClose} onSave={() => onSave({ webhookUrl, message })}>
      <Field label="Discord Webhook URL" hint="Get this from your Discord server settings">
        <input className={inputCls} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
      </Field>
      <Field label="Custom Message (optional)" hint="Leave blank to automatically send the output from the previous block">
        <textarea className={inputCls + ' resize-none'} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional: override with custom message…" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Text Join config (text1, text2, separator)
// ══════════════════════════════════════════════════════
function TextJoinConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [text1, setText1] = useState((config.text1 as string) ?? '');
  const [text2, setText2] = useState((config.text2 as string) ?? '');
  const [separator, setSeparator] = useState((config.separator as string) ?? ' ');
  return (
    <ModalShell title="Configure: Text Join" onClose={onClose} onSave={() => onSave({ text1, text2, separator })}>
      <Field label="First text" hint="Leave blank if this comes from an upstream block">
        <textarea className={inputCls + ' resize-none'} rows={2} value={text1} onChange={(e) => setText1(e.target.value)} placeholder="First text…" />
      </Field>
      <Field label="Second text" hint="Leave blank if this comes from an upstream block">
        <textarea className={inputCls + ' resize-none'} rows={2} value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Second text…" />
      </Field>
      <Field label="Separator" hint="Character(s) between the two texts (default: space)">
        <input className={inputCls} value={separator} onChange={(e) => setSeparator(e.target.value)} placeholder=" " />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Conditional config (text + pattern)
// ══════════════════════════════════════════════════════
function ConditionalConfig({ config, onSave, onClose }: { config: NodeConfig; onSave: (c: NodeConfig) => void; onClose: () => void }) {
  const [text, setText] = useState((config.text as string) ?? '');
  const [pattern, setPattern] = useState((config.pattern as string) ?? '');
  return (
    <ModalShell title="Configure: Conditional" onClose={onClose} onSave={() => onSave({ text, pattern })}>
      <Field label="Text to check" hint="Leave blank to use upstream text">
        <textarea className={inputCls + ' resize-none'} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text…" />
      </Field>
      <Field label="Contains pattern" hint="Optional: check if text contains this substring">
        <input className={inputCls} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="e.g. error" />
      </Field>
    </ModalShell>
  );
}

// ══════════════════════════════════════════════════════
//  Router — picks the right modal based on blockType
// ══════════════════════════════════════════════════════
export function ConfigModalRouter({
  blockType,
  config,
  onSave,
  onClose,
}: {
  blockType: string;
  config: NodeConfig;
  onSave: (config: NodeConfig) => void;
  onClose: () => void;
}) {
  switch (blockType) {
    // ── Triggers ──
    case 'manual_trigger':
    case 'on_text_input':
    case 'on_file_upload':
      return <TriggerConfig config={config} onSave={onSave} onClose={onClose} />;

    // ── Conditions ──
    case 'text_contains':
      return <TextContainsConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'confidence_check':
      return <ConfidenceCheckConfig config={config} onSave={onSave} onClose={onClose} />;

    // ── Actions ──
    case 'webhook':
      return <WebhookConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'send_email':
      return <SendEmailConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'send-slack':
      return <SendSlackConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'send-discord':
      return <SendDiscordConfig config={config} onSave={onSave} onClose={onClose} />;

    // ── Utility blocks ──
    case 'constant':
      return <ConstantConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'text-join':
      return <TextJoinConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'conditional':
      return <ConditionalConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'fetch-url':
      return <FetchUrlConfig config={config} onSave={onSave} onClose={onClose} />;

    // ── AI blocks ──
    case 'summarize-text':
      return <AIBlockConfig config={config} onSave={onSave} onClose={onClose}
        label="Summarize Text"
        inputLabel="Text to summarize"
        placeholder="Paste a long document or article here…"
      />;
    case 'extract-emails':
      return <AIBlockConfig config={config} onSave={onSave} onClose={onClose}
        label="Extract Emails"
        inputLabel="Text to scan for emails"
        hint="Paste text that may contain email addresses. Leave blank if input comes from an upstream block."
        placeholder="Paste text containing email addresses here…"
      />;
    case 'rewrite-prompt':
      return <AIBlockConfig config={config} onSave={onSave} onClose={onClose}
        label="Rewrite Prompt"
        inputLabel="Text to rewrite"
        placeholder="Paste messy or unclear text here…"
      />;
    case 'classify-input':
      return <AIBlockConfig config={config} onSave={onSave} onClose={onClose}
        label="Classify Sentiment"
        inputLabel="Text to analyze"
        placeholder="Paste a message or review to analyze sentiment…"
      />;
    case 'translate-text':
      return <TranslateTextConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'text-to-speech':
      return <TextToSpeechConfig config={config} onSave={onSave} onClose={onClose} />;
    case 'speech-to-text':
      return <SpeechToTextConfig config={config} onSave={onSave} onClose={onClose} />;

    default:
      return null; // no config modal needed (e.g. text_not_empty, log_output, save_result)
  }
}
