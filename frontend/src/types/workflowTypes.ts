/**
 * Workflow-related type definitions.
 */

/** Output key for base64-encoded audio from blocks (e.g. text-to-speech). */
export const AUDIO_OUTPUT_KEY = 'audioBase64' as const;

/** Block output that may contain base64-encoded audio. */
export interface AudioBlockOutput {
  [AUDIO_OUTPUT_KEY]?: string;
  [key: string]: unknown;
}

/** Predicate: does the output contain playable audio? */
export function hasAudioOutput(output: Record<string, unknown> | null | undefined): output is AudioBlockOutput {
  const val = output?.[AUDIO_OUTPUT_KEY];
  return typeof val === 'string' && val.length > 0;
}
