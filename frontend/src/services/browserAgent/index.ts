/**
 * Browser agent service — provides types and a factory for browser automation.
 * In the browser context, this is a stub; full automation typically runs in a headless environment.
 */

import type { BrowserAgent, BrowserAgentConfig } from './types';

export type { BrowserAgent, BrowserAgentConfig, NavigateResult, ClickResult, TypeResult } from './types';

/**
 * Create a browser agent instance. In client-side context this returns a stub
 * that logs actions; real automation would use Puppeteer/Playwright in a backend service.
 */
export function createBrowserAgent(config: BrowserAgentConfig = {}): BrowserAgent {
  const baseConfig: BrowserAgentConfig = {
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
    timeout: 30000,
    ...config,
  };

  return {
    config: baseConfig,

    navigate: async (url: string) => {
      const fullUrl = url.startsWith('http') ? url : `${baseConfig.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      if (typeof window !== 'undefined') {
        window.location.href = fullUrl;
        return { success: true, url: fullUrl, title: document.title };
      }
      return { success: false, url: fullUrl, error: 'Not in browser context' };
    },

    click: async (selector: string) => {
      if (typeof document === 'undefined') {
        return { success: false, error: 'Not in browser context' };
      }
      const el = document.querySelector(selector);
      if (!el) return { success: false, error: `Element not found: ${selector}` };
      (el as HTMLElement).click();
      return { success: true, element: selector };
    },

    type: async (selector: string, text: string) => {
      if (typeof document === 'undefined') {
        return { success: false, value: text, error: 'Not in browser context' };
      }
      const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return { success: false, value: text, error: `Element not found: ${selector}` };
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, value: text };
    },

    getText: async (selector: string) => {
      if (typeof document === 'undefined') {
        return { text: '', error: 'Not in browser context' };
      }
      const el = document.querySelector(selector);
      if (!el) return { text: '', error: `Element not found: ${selector}` };
      const text = el.textContent ?? '';
      return { text };
    },
  };
}
