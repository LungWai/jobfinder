import { Browser, Page, chromium } from 'playwright';
import { JobListing, ScrapingResult, ScrapingConfig } from '../types/job';
import { generateJobHash, cleanText } from '../utils/hash';
import logger from '../utils/logger';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  /**
   * Initialize the browser and page
   */
  async initialize(): Promise<void> {
    try {
      // Launch browser with anti-detection measures
      this.browser = await chromium.launch({
        headless: true, // Run in headless mode for production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--start-maximized'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Randomize user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // Set user agent and additional headers
      await this.page.setExtraHTTPHeaders({
        'User-Agent': randomUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Remove navigator.webdriver flag
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false
        });
      });

      // Add more realistic browser properties
      await this.page.evaluateOnNewDocument(() => {
        // Override the plugins property
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });

        // Override the languages property
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });

        // Override the permissions property
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      // Set viewport with device scale factor
      await this.page.setViewportSize({ 
        width: 1920, 
        height: 1080
      });
      
      // Random mouse movements to appear human-like
      await this.addRandomMouseMovements();
      
      logger.info(`Initialized browser for ${this.config.portal} with anti-detection measures`);
    } catch (error) {
      logger.error(`Failed to initialize browser for ${this.config.portal}:`, error);
      throw error;
    }
  }

  /**
   * Add random mouse movements to appear more human-like
   */
  private async addRandomMouseMovements(): Promise<void> {
    if (!this.page) return;
    
    try {
      // Move mouse to random positions
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(Math.random() * 1920);
        const y = Math.floor(Math.random() * 1080);
        await this.page.mouse.move(x, y);
        await this.delay(Math.random() * 500 + 200);
      }
    } catch (error) {
      // Ignore mouse movement errors
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info(`Cleaned up browser for ${this.config.portal}`);
    } catch (error) {
      logger.error(`Error during cleanup for ${this.config.portal}:`, error);
    }
  }

  /**
   * Add delay between requests
   */
  protected async delay(ms: number = this.config.requestDelay): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Navigate to a URL with retry logic
   */
  protected async navigateWithRetry(url: string, retries: number = this.config.maxRetries): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        logger.debug(`Successfully navigated to ${url} on attempt ${attempt}`);
        return;
      } catch (error) {
        logger.warn(`Navigation attempt ${attempt} failed for ${url}:`, error);
        if (attempt === retries) {
          throw new Error(`Failed to navigate to ${url} after ${retries} attempts`);
        }
        await this.delay(2000 * attempt); // Exponential backoff
      }
    }
  }

  /**
   * Extract job data from a page element
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    try {
      const title = await this.extractText(element, this.config.selectors.title);
      const company = await this.extractText(element, this.config.selectors.company);
      const location = await this.extractText(element, this.config.selectors.location);
      const description = await this.extractText(element, this.config.selectors.description);
      const link = await this.extractLink(element, this.config.selectors.link);

      if (!title || !company || !link) {
        logger.debug('Skipping job due to missing required fields');
        return null;
      }

      const jobData: Partial<JobListing> = {
        title: cleanText(title),
        company: cleanText(company),
        location: cleanText(location),
        description: cleanText(description),
        originalUrl: this.resolveUrl(link),
        sourcePortal: this.config.portal,
        lastScrapedAt: new Date()
      };

      // Extract salary if selector is provided
      if (this.config.selectors.salary) {
        const salaryText = await this.extractText(element, this.config.selectors.salary);
        if (salaryText) {
          // Salary parsing will be implemented in utils
          jobData.description += `\nSalary: ${salaryText}`;
        }
      }

      // Extract deadline if selector is provided
      if (this.config.selectors.deadline) {
        const deadlineText = await this.extractText(element, this.config.selectors.deadline);
        if (deadlineText) {
          // Date parsing will be implemented
          jobData.description += `\nDeadline: ${deadlineText}`;
        }
      }

      // Generate content hash for deduplication
      jobData.contentHash = generateJobHash(jobData);

      return jobData;
    } catch (error) {
      logger.error('Error extracting job data:', error);
      return null;
    }
  }

  /**
   * Extract text content from an element
   */
  protected async extractText(parent: any, selector: string): Promise<string> {
    try {
      const element = await parent.$(selector);
      return element ? await element.textContent() : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract link href from an element
   */
  protected async extractLink(parent: any, selector: string): Promise<string> {
    try {
      const element = await parent.$(selector);
      return element ? await element.getAttribute('href') || '' : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  protected resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
    return `${this.config.baseUrl}/${url}`;
  }

  /**
   * Navigate to a URL with retry logic and anti-detection
   */
  protected async navigateWithRetry(url: string, maxRetries: number = 3): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Random delay before navigation
        await this.delay(Math.random() * 2000 + 1000);
        
        logger.info(`Navigation attempt ${attempt} to ${url}`);
        
        // Navigate with random wait strategy
        const waitStrategies = ['domcontentloaded', 'networkidle', 'load'];
        const randomStrategy = waitStrategies[Math.floor(Math.random() * waitStrategies.length)];
        
        await this.page.goto(url, {
          waitUntil: randomStrategy as any,
          timeout: 60000 // Increased timeout
        });
        
        // Random delay after page load
        await this.delay(Math.random() * 3000 + 2000);
        
        // Check if we got blocked
        const title = await this.page.title();
        const bodyText = await this.page.textContent('body');
        
        if (title.toLowerCase().includes('blocked') || 
            title.toLowerCase().includes('captcha') ||
            title.toLowerCase().includes('access denied') ||
            title.toLowerCase().includes('cloudflare') ||
            bodyText?.toLowerCase().includes('you have been blocked') ||
            bodyText?.toLowerCase().includes('suspicious activity')) {
          logger.warn(`Possible blocking detected: ${title}`);
          
          // Try to wait and retry with different approach
          if (attempt < maxRetries) {
            logger.info('Implementing anti-detection measures...');
            await this.delay(30000); // Wait 30 seconds
            await this.addRandomMouseMovements();
            continue;
          }
          
          throw new Error(`Blocked by ${this.config.portal}: ${title}`);
        }
        
        // Simulate human-like scrolling
        await this.simulateHumanScrolling();
        
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Navigation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff with randomization
          const backoffTime = (2000 * attempt) + (Math.random() * 5000);
          await this.delay(backoffTime);
        }
      }
    }
    
    throw lastError || new Error('Navigation failed after retries');
  }

  /**
   * Simulate human-like scrolling behavior
   */
  private async simulateHumanScrolling(): Promise<void> {
    if (!this.page) return;
    
    try {
      // Scroll down gradually
      const scrollSteps = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < scrollSteps; i++) {
        const scrollDistance = Math.floor(Math.random() * 300) + 100;
        await this.page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
        
        await this.delay(Math.random() * 1000 + 500);
      }
      
      // Sometimes scroll back up a bit
      if (Math.random() > 0.5) {
        await this.page.evaluate(() => {
          window.scrollBy(0, -200);
        });
      }
    } catch (error) {
      // Ignore scroll errors
    }
  }

  /**
   * Add delay between requests with randomization
   */
  protected async delay(ms?: number): Promise<void> {
    // Add randomization to delays to appear more human-like
    const baseDelay = ms || this.config.requestDelay || 2000;
    const randomizedDelay = baseDelay + (Math.random() * 1000 - 500); // +/- 500ms
    await new Promise(resolve => setTimeout(resolve, Math.max(randomizedDelay, 1000)));
  }

  /**
   * Abstract method to be implemented by specific scrapers
   */
  abstract scrape(): Promise<ScrapingResult>;
}
