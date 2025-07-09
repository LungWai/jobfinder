import { BaseScraper } from './base-scraper';
import { JobListing, ScrapingResult, ScrapingConfig } from '../types/job';
import { JobService } from '../services/job.service';
import logger from '../utils/logger';

export class GoodJobsScraper extends BaseScraper {
  private jobService: JobService;

  constructor() {
    const config: ScrapingConfig = {
      portal: 'CT Good Jobs',
      baseUrl: 'https://goodjobs.com.hk',
      selectors: {
        jobContainer: '.job-item, .job-card',
        title: '.job-title a, h3 a',
        company: '.company-name, .employer-name',
        location: '.job-location, .location',
        description: '.job-summary, .job-description',
        link: '.job-title a, h3 a',
        salary: '.salary, .job-salary'
      },
      pagination: {
        nextButton: '.pagination .next, .pager-next',
        maxPages: 8
      },
      requestDelay: 3000, // Be more conservative with CT Good Jobs
      maxRetries: 3
    };
    super(config);
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
      const jobService = this.jobService;

      while (currentPage <= maxPages) {
        logger.info(`Scraping page ${currentPage} of ${this.config.portal}`);

        try {
          // Wait for job listings to load
          await this.page.waitForSelector(this.config.selectors.jobContainer, { timeout: 15000 });
          
          // Get all job containers on the current page
          const jobElements = await this.page.$$(this.config.selectors.jobContainer);
          logger.info(`Found ${jobElements.length} job listings on page ${currentPage}`);

          // Extract data from each job listing
          for (const jobElement of jobElements) {
            try {
              const jobData = await this.extractJobData(jobElement);
              if (jobData && jobData.title && jobData.company) {
                // Save to database
                const saveResult = await jobService.saveJob(jobData);
                result.jobsScraped++;
                
                if (saveResult.isNew) {
                  result.jobsNew++;
                  logger.info(`New job saved: ${jobData.title} at ${jobData.company}`);
                } else {
                  result.jobsUpdated++;
                  logger.debug(`Job updated: ${jobData.title} at ${jobData.company}`);
                }
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
            const isHidden = await nextButton.isHidden();
            
            if (!isDisabled && !isHidden) {
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
      
      logger.info(`Completed scraping ${this.config.portal}. Jobs found: ${result.jobsScraped}, New: ${result.jobsNew}, Updated: ${result.jobsUpdated}`);

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
   * Override extractJobData for CT Good Jobs-specific logic
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    const baseData = await super.extractJobData(element);
    if (!baseData) return null;

    try {
      // CT Good Jobs-specific enhancements
      // Extract additional metadata if available
      const salaryElement = await element.$(this.config.selectors.salary || '');
      if (salaryElement) {
        const salaryText = await salaryElement.textContent();
        if (salaryText && salaryText.trim()) {
          baseData.description += `\nSalary: ${salaryText.trim()}`;
        }
      }

      // Extract job type if available
      const typeElement = await element.$('.job-type, .employment-type');
      if (typeElement) {
        const typeText = await typeElement.textContent();
        if (typeText) {
          baseData.employmentType = typeText.trim();
        }
      }

      // Set source portal
      baseData.sourcePortal = this.config.portal;

      // Ensure we have required fields
      if (!baseData.title || !baseData.company) {
        logger.warn('Missing required fields in GoodJobs job data', { title: baseData.title, company: baseData.company });
        return null;
      }

      return baseData;
    } catch (error) {
      logger.error('Error in CT Good Jobs-specific extraction:', error);
      return baseData;
    }
  }
}
