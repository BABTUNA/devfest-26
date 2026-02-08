import { chromium } from 'playwright';

export interface BrowserAgentOptions {
  url: string;
  waitForSelector?: string;
  extractSelector?: string;
  timeout?: number;
}

export interface BrowserAgentResult {
  title: string;
  text: string;
  url: string;
  success: boolean;
  error?: string;
}

function extractUrlFromText(text: string): string {
  // Look for http:// or https:// URLs
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  return urlMatch ? urlMatch[0] : '';
}

export async function runBrowserAgent(options: BrowserAgentOptions): Promise<BrowserAgentResult> {
  const { url: rawUrl, waitForSelector, extractSelector, timeout = 30000 } = options;
  
  // Extract actual URL from text (in case it contains other content)
  const url = extractUrlFromText(rawUrl);
  
  if (!url) {
    return {
      title: '',
      text: '',
      url: rawUrl,
      success: false,
      error: 'No valid URL found in input',
    };
  }

  let browser;
  try {
    console.log(`[Browser Agent] Navigating to: ${url}`);
    
    // Launch browser with anti-detection args
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      bypassCSP: true,
    });

    const page = await context.newPage();
    
    // Add scripts to evade detection
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Override navigator.plugins to appear as a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
    
    // Navigate to URL with timeout
    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: timeout,
    });

    console.log(`[Browser Agent] Page loaded with status: ${response?.status()}`);
    
    // Check if we got blocked
    if (response?.status() === 403) {
      console.warn('[Browser Agent] Got 403 - site may be blocking automation');
      // Try to get whatever content we can anyway
    }

    // Wait for page to stabilize and JS to execute
    await page.waitForTimeout(3000);

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
        console.warn(`[Browser Agent] Selector "${waitForSelector}" not found, continuing...`);
      });
    }

    // Get page title
    const title = await page.title();
    console.log(`[Browser Agent] Page title: ${title}`);

    // Extract text content
    let text = '';
    if (extractSelector) {
      // Extract from specific selector
      const element = await page.locator(extractSelector).first();
      text = await element.innerText().catch(() => '');
    } else {
      // Extract all readable text from the page with multiple fallback strategies
      text = await page.evaluate(() => {
        // Strategy 1: Try to get main content areas
        const mainSelectors = [
          'main',
          'article',
          '[role="main"]',
          '#content',
          '.content',
          '.post',
          '.entry',
          '#main-content',
          '.main-content',
          '[data-testid="post-container"]', // Reddit specific
          'shreddit-post', // Reddit web component
        ];
        
        for (const selector of mainSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = (el as HTMLElement).innerText || el.textContent;
            if (text && text.trim().length > 100) {
              return text;
            }
          }
        }

        // Strategy 2: Get all paragraphs
        const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        const paraText = Array.from(paragraphs)
          .map(p => (p as HTMLElement).innerText || p.textContent)
          .filter(t => t && t.trim().length > 20)
          .join('\n\n');
        
        if (paraText.length > 100) {
          return paraText;
        }

        // Strategy 3: Remove unwanted elements and get body text
        const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, aside, [role="navigation"], .advertisement, .ads, .sidebar, nav');
        elementsToRemove.forEach(el => el.remove());

        return document.body?.innerText || document.body?.textContent || '';
      });
    }

    console.log(`[Browser Agent] Extracted ${text.length} characters of text`);

    // If we got blocked and have no content, return an informative error
    if (!text && response?.status() === 403) {
      return {
        title,
        text: '',
        url: page.url(),
        success: false,
        error: 'This website blocks automated browsers. Try using a simpler website or the Fetch URL block instead.',
      };
    }

    // Clean up the text
    const cleanText = text
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .replace(/[ \t]+/g, ' ')     // Collapse spaces
      .replace(/\n /g, '\n')       // Remove leading spaces
      .replace(/ \n/g, '\n')       // Remove trailing spaces
      .trim();

    return {
      title,
      text: cleanText.slice(0, 100000), // Cap at 100KB
      url: page.url(),
      success: cleanText.length > 0,
    };

  } catch (error) {
    console.error('[Browser Agent] Error:', error);
    return {
      title: '',
      text: '',
      url: url,
      success: false,
      error: error instanceof Error ? error.message : 'Browser automation failed',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
