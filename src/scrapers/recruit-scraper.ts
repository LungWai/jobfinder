import { BaseScraper } from './base-scraper';
import { JobListing, ScrapingResult, ScrapingConfig } from '../types/job';
import { JobService } from '../database/job-service';
import logger from '../utils/logger';

export class RecruitScraper extends BaseScraper {
  private jobService: JobService;

  constructor() {
    const config: ScrapingConfig = {
      portal: 'Recruit.com.hk',
      baseUrl: 'https://www.recruit.com.hk',
      selectors: {
        // Updated selectors based on actual Recruit.com.hk structure
        jobContainer: 'div.job-opportunity, article.job-card, .search-result-item',
        title: 'h3.job-title a, .job-title-link, a.job-link',
        company: '.company-name, .employer-name, .job-company',
        location: '.job-location, .location-text, .job-area',
        description: '.job-description, .job-details, .job-summary',
        link: 'a.job-link, h3.job-title a, .job-title-link',
        salary: '.salary-info, .job-salary, .salary-range'
      },
      pagination: {
        nextButton: 'a.next-page, button.pagination-next, .pagination a[rel="next"]',
        maxPages: 5  // Start with fewer pages for testing
      },
      requestDelay: 2500,
      maxRetries: 3
    };
    super(config);
    this.jobService = new JobService();
  }

  /**
   * Get job service instance
   */
  private async getJobService(): Promise<JobService> {
    return this.jobService;
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

      // Start with the main jobs page - Recruit.com.hk search page
      // Search for jobs in Hong Kong
      const searchUrl = `${this.config.baseUrl}/search.aspx?lang=E&dis=2`; // dis=2 is Hong Kong
      
      logger.info(`Navigating to Recruit.com.hk: ${searchUrl}`);
      await this.navigateWithRetry(searchUrl);
      
      logger.info(`Starting to scrape ${this.config.portal}`);

      let currentPage = 1;
      const maxPages = this.config.pagination?.maxPages || 5;
      const jobService = await this.getJobService();

      while (currentPage <= maxPages) {
        logger.info(`Scraping page ${currentPage} of ${this.config.portal}`);

        try {
          // Wait for job listings to load
          await this.page.waitForSelector(this.config.selectors.jobContainer, { 
            timeout: 30000,
            state: 'visible'
          });
          
          // Additional wait to ensure content is loaded
          await this.delay(2000);
          
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
          if (currentPage < maxPages) {
            const nextButton = await this.page.$(this.config.pagination?.nextButton || '');
            if (nextButton) {
              const isDisabled = await nextButton.getAttribute('disabled');
              const isHidden = await nextButton.isHidden();
              
              if (!isDisabled && !isHidden) {
                // Scroll to button first
                await nextButton.scrollIntoViewIfNeeded();
                await this.delay(1000);
                
                await nextButton.click();
                await this.delay(3000); // Wait for navigation
                currentPage++;
                
                // Wait for new page to load
                await this.page.waitForLoadState('networkidle', { timeout: 30000 });
              } else {
                logger.info('Next button is disabled, reached last page');
                break;
              }
            } else {
              logger.info('No next button found, reached last page');
              break;
            }
          } else {
            logger.info(`Completed scraping ${maxPages} pages`);
            break;
          }

        } catch (error) {
          logger.error(`Error scraping page ${currentPage}:`, error);
          result.errors.push(`Page ${currentPage}: ${error}`);
          
          // Try to continue with next page if possible
          if (currentPage < maxPages) {
            currentPage++;
            continue;
          } else {
            break;
          }
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
   * Override extractJobData for Recruit.com.hk-specific logic
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    try {
      // Extract basic data using parent method
      const baseData = await super.extractJobData(element);
      if (!baseData) return null;

      // Recruit.com.hk-specific enhancements
      // Set source portal
      baseData.sourcePortal = this.config.portal;

      // Extract salary information if available
      const salaryElement = await element.$(this.config.selectors.salary);
      if (salaryElement) {
        const salaryText = await salaryElement.textContent();
        if (salaryText && salaryText.trim()) {
          const salary = salaryText.trim();
          // Try to parse salary range
          const salaryMatch = salary.match(/HK\$([\d,]+)\s*-\s*HK\$([\d,]+)/);
          if (salaryMatch) {
            baseData.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
            baseData.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
          }
          // Add to description as well
          baseData.description = (baseData.description || '') + `\nSalary: ${salary}`;
        }
      }

      // Extract experience level if available
      const expElement = await element.$('.experience, .exp-level, .job-exp');
      if (expElement) {
        const expText = await expElement.textContent();
        if (expText) {
          baseData.experienceLevel = expText.trim();
        }
      }

      // Extract employment type
      const typeElement = await element.$('.job-type, .employment-type');
      if (typeElement) {
        const typeText = await typeElement.textContent();
        if (typeText) {
          baseData.employmentType = this.normalizeEmploymentType(typeText.trim());
        }
      }

      // Extract posted date if available
      const dateElement = await element.$('.post-date, .job-date, time');
      if (dateElement) {
        const dateText = await dateElement.textContent();
        if (dateText) {
          // Try to parse the date
          const date = new Date(dateText);
          if (!isNaN(date.getTime())) {
            baseData.postedDate = date;
          }
        }
      }

      // Ensure we have required fields
      if (!baseData.title || !baseData.company) {
        logger.warn('Missing required fields in job data', { title: baseData.title, company: baseData.company });
        return null;
      }

      // Ensure we have a full URL
      if (baseData.originalUrl && !baseData.originalUrl.startsWith('http')) {
        baseData.originalUrl = `${this.config.baseUrl}${baseData.originalUrl}`;
      }

      return baseData;
    } catch (error) {
      logger.error('Error in Recruit.com.hk-specific extraction:', error);
      return null;
    }
  }

  /**
   * Normalize employment type to standard values
   */
  private normalizeEmploymentType(type: string): string {
    const normalized = type.toLowerCase();
    if (normalized.includes('full time') || normalized.includes('full-time')) {
      return 'Full-time';
    } else if (normalized.includes('part time') || normalized.includes('part-time')) {
      return 'Part-time';
    } else if (normalized.includes('contract')) {
      return 'Contract';
    } else if (normalized.includes('temporary')) {
      return 'Temporary';
    } else if (normalized.includes('freelance')) {
      return 'Freelance';
    }
    return type; // Return original if no match
  }
}
