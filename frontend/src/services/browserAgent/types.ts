/**
 * Browser agent types — for automation and browser interaction.
 */

export interface BrowserAgentConfig {
  /** Base URL for navigation */
  baseUrl?: string;
  /** Timeout in ms for actions */
  timeout?: number;
}

export interface NavigateResult {
  success: boolean;
  url: string;
  title?: string;
  error?: string;
}

export interface ClickResult {
  success: boolean;
  element?: string;
  error?: string;
}

export interface TypeResult {
  success: boolean;
  value: string;
  error?: string;
}

export interface BrowserAgentActions {
  navigate: (url: string) => Promise<NavigateResult>;
  click: (selector: string) => Promise<ClickResult>;
  type: (selector: string, text: string) => Promise<TypeResult>;
  getText: (selector: string) => Promise<{ text: string; error?: string }>;
}

export type BrowserAgent = BrowserAgentActions & {
  config: BrowserAgentConfig;
};
