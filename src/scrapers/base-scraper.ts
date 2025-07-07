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
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Set viewport
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
      logger.info(`Initialized browser for ${this.config.portal}`);
    } catch (error) {
      logger.error(`Failed to initialize browser for ${this.config.portal}:`, error);
      throw error;
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
   * Abstract method to be implemented by specific scrapers
   */
  abstract scrape(): Promise<ScrapingResult>;
}
