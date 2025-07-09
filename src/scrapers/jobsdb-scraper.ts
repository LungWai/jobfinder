import { BaseScraper } from './base-scraper';
import { JobListing, ScrapingResult, ScrapingConfig } from '../types/job';
import { JobService } from '../services/job.service';
import logger from '../utils/logger';

export class JobsDBScraper extends BaseScraper {
  private jobService: JobService;

  constructor() {
    const config: ScrapingConfig = {
      name: 'JobsDB',
      baseUrl: 'https://hk.jobsdb.com',
      portal: 'JobsDB',
      requestDelay: 2000,
      maxRetries: 3,
      selectors: {
        jobContainer: 'article[data-search-sol-meta]',
        title: 'h3[data-automation="job-card-title"] a',
        company: 'a[data-automation="job-card-employer"]',
        location: 'span[data-automation="job-card-location"]',
        salary: 'span[data-automation="job-card-salary"]',
        description: 'div[data-automation="job-card-snippet"]',
        link: 'h3[data-automation="job-card-title"] a',
        jobTitle: 'h3[data-automation="job-card-title"] a',
        jobTitleAlternate: 'a[data-automation="job-title"]',
        companyAlternate: 'span[data-automation="job-card-employer"]',
        linkAlternate: 'a[data-automation="job-title"]',
        postedDate: 'time[datetime]',
        jobType: 'span[data-automation="job-card-work-type"]',
        employmentType: 'span[data-automation="job-card-classification"]'
      },
      pagination: {
        nextButton: 'a[data-automation="page-next"]',
        maxPages: 10
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      delay: {
        min: 2000,
        max: 5000
      }
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

      // Search for IT jobs in Hong Kong as a starting point
      const searchUrl = `${this.config.baseUrl}/jobs?keywords=&location=Hong%20Kong`;
      
      logger.info(`Navigating to JobsDB: ${searchUrl}`);
      await this.navigateWithRetry(searchUrl);
      
      // Handle cookie consent if present
      try {
        const cookieButton = await this.page.$('button[data-automation="accept-cookies-button"]');
        if (cookieButton) {
          await cookieButton.click();
          await this.delay(1000);
        }
      } catch (e) {
        // Cookie banner might not be present
      }

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
              const isDisabled = await nextButton.getAttribute('aria-disabled') === 'true';
              if (!isDisabled) {
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
   * Override extractJobData for JobsDB-specific logic
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    try {
      // Extract basic data using parent method
      const baseData = await super.extractJobData(element);
      if (!baseData) return null;

      // JobsDB-specific enhancements
      // Extract job ID from the element attribute
      const jobId = await element.getAttribute('data-job-id');
      if (jobId) {
        baseData.originalUrl = `${this.config.baseUrl}/job/${jobId}`;
      } else if (baseData.originalUrl) {
        // Ensure we have a full URL
        if (!baseData.originalUrl.startsWith('http')) {
          baseData.originalUrl = `${this.config.baseUrl}${baseData.originalUrl}`;
        }
      }

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

      // Extract job type if available
      const jobTypeElement = await element.$(this.config.selectors.jobType);
      if (jobTypeElement) {
        const jobType = await jobTypeElement.textContent();
        if (jobType) {
          baseData.employmentType = this.normalizeEmploymentType(jobType.trim());
        }
      }

      // Extract classification/category
      const classificationElement = await element.$(this.config.selectors.employmentType);
      if (classificationElement) {
        const classification = await classificationElement.textContent();
        if (classification) {
          baseData.jobCategory = classification.trim();
        }
      }

      // Extract posted date
      const dateElement = await element.$('time[datetime]');
      if (dateElement) {
        const dateTime = await dateElement.getAttribute('datetime');
        if (dateTime) {
          baseData.postedDate = new Date(dateTime);
        }
      }

      // Ensure we have required fields
      if (!baseData.title || !baseData.company) {
        logger.warn('Missing required fields in job data', { title: baseData.title, company: baseData.company });
        return null;
      }

      return baseData;
    } catch (error) {
      logger.error('Error in JobsDB-specific extraction:', error);
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
    } else if (normalized.includes('intern')) {
      return 'Internship';
    }
    return type; // Return original if no match
  }
}
