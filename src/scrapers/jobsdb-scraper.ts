import { JobListing, ScrapingResult } from '../types/job';
import { generateJobHash } from '../utils/hash';
import { JobService } from '../database/job-service';
import logger from '../utils/logger';

export class JobsDBScraper {
  private jobService: JobService;
  private baseUrl = 'https://hk.jobsdb.com';
  private portal = 'JobsDB';

  constructor() {
    this.jobService = new JobService();
  }

  async scrape(): Promise<ScrapingResult> {
    const startTime = Date.now();
    const result: ScrapingResult = {
      success: false,
      jobsScraped: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      errors: [],
      portal: this.config.portal,
      duration: 0
    };

    try {
      await this.initialize();
      
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      // Start with the main jobs page
      const searchUrl = `${this.config.baseUrl}/jobs`;
      await this.navigateWithRetry(searchUrl);
      
      logger.info(`Starting to scrape ${this.config.portal}`);

      let currentPage = 1;
      const maxPages = this.config.pagination?.maxPages || 5;

      while (currentPage <= maxPages) {
        logger.info(`Scraping page ${currentPage} of ${this.config.portal}`);

        try {
          // Wait for job listings to load
          await this.page.waitForSelector(this.config.selectors.jobContainer, { timeout: 10000 });
          
          // Get all job containers on the current page
          const jobElements = await this.page.$$(this.config.selectors.jobContainer);
          logger.info(`Found ${jobElements.length} job listings on page ${currentPage}`);

          // Extract data from each job listing
          for (const jobElement of jobElements) {
            try {
              const jobData = await this.extractJobData(jobElement);
              if (jobData) {
                // Here we would save to database
                // For now, just count the jobs
                result.jobsScraped++;
                logger.debug(`Extracted job: ${jobData.title} at ${jobData.company}`);
              }
            } catch (error) {
              logger.error('Error processing job element:', error);
              result.errors.push(`Error processing job on page ${currentPage}: ${error}`);
            }
          }

          // Try to navigate to next page
          const nextButton = await this.page.$(this.config.pagination?.nextButton || '');
          if (nextButton && currentPage < maxPages) {
            const isDisabled = await nextButton.getAttribute('disabled');
            if (!isDisabled) {
              await nextButton.click();
              await this.delay();
              currentPage++;
              
              // Wait for new page to load
              await this.page.waitForLoadState('networkidle');
            } else {
              logger.info('Reached last page or next button is disabled');
              break;
            }
          } else {
            logger.info(`Completed scraping ${maxPages} pages or no more pages available`);
            break;
          }

        } catch (error) {
          logger.error(`Error scraping page ${currentPage}:`, error);
          result.errors.push(`Page ${currentPage}: ${error}`);
          break;
        }
      }

      result.success = result.errors.length === 0 || result.jobsScraped > 0;
      result.jobsNew = result.jobsScraped; // For now, assume all are new
      
      logger.info(`Completed scraping ${this.config.portal}. Jobs found: ${result.jobsScraped}`);

    } catch (error) {
      logger.error(`Fatal error scraping ${this.config.portal}:`, error);
      result.errors.push(`Fatal error: ${error}`);
      result.success = false;
    } finally {
      await this.cleanup();
      result.duration = Math.round((Date.now() - startTime) / 1000);
    }

    return result;
  }

  /**
   * Override extractJobData for JobsDB-specific logic
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    const baseData = await super.extractJobData(element);
    if (!baseData) return null;

    try {
      // JobsDB-specific enhancements
      // Extract additional metadata if available
      const salaryElement = await element.$(this.config.selectors.salary || '');
      if (salaryElement) {
        const salaryText = await salaryElement.textContent();
        if (salaryText && salaryText.trim()) {
          // Parse salary information
          baseData.description += `\nSalary: ${salaryText.trim()}`;
        }
      }

      // Extract job type/category if available
      const categoryElement = await element.$('[data-automation="jobClassification"]');
      if (categoryElement) {
        const categoryText = await categoryElement.textContent();
        if (categoryText) {
          baseData.jobCategory = categoryText.trim();
        }
      }

      return baseData;
    } catch (error) {
      logger.error('Error in JobsDB-specific extraction:', error);
      return baseData;
    }
  }
}
