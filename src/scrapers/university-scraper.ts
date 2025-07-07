import { BaseScraper } from './base-scraper';
import { JobListing, ScrapingResult, ScrapingConfig } from '../types/job';
import logger from '../utils/logger';

export class UniversityScraper extends BaseScraper {
  private universities = [
    { name: 'University of Hong Kong', url: 'https://jobs.hku.hk' },
    { name: 'Chinese University of Hong Kong', url: 'https://www.cuhk.edu.hk/ohr/index.php/en/career-opportunities' },
    { name: 'Hong Kong University of Science and Technology', url: 'https://career.ust.hk' },
    { name: 'City University of Hong Kong', url: 'https://www.cityu.edu.hk/hro/en/job_vacancy.htm' },
    { name: 'Hong Kong Polytechnic University', url: 'https://www.polyu.edu.hk/hro/careers/' },
    { name: 'Hong Kong Baptist University', url: 'https://hr.hkbu.edu.hk/career-opportunities' },
    { name: 'Lingnan University', url: 'https://www.ln.edu.hk/hr/career-opportunities' },
    { name: 'Education University of Hong Kong', url: 'https://www.eduhk.hk/hr/career-opportunities' }
  ];

  constructor() {
    const config: ScrapingConfig = {
      portal: 'University Jobs',
      baseUrl: 'https://jobs.edu.hk',
      selectors: {
        jobContainer: '.job-item, .vacancy-item, .position-item',
        title: '.job-title, .position-title, h3',
        company: '.department, .faculty, .university',
        location: '.location, .campus',
        description: '.job-description, .summary, .details',
        link: '.job-title a, .position-title a, h3 a',
        deadline: '.deadline, .closing-date'
      },
      pagination: {
        nextButton: '.pagination .next, .next-page',
        maxPages: 5
      },
      requestDelay: 4000, // Be respectful to university servers
      maxRetries: 2
    };
    super(config);
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

      logger.info(`Starting to scrape ${this.config.portal}`);

      // For this MVP, we'll focus on a general university jobs portal
      // In production, you would iterate through each university
      const searchUrl = `${this.config.baseUrl}/jobs`;
      
      try {
        await this.navigateWithRetry(searchUrl);
        
        let currentPage = 1;
        const maxPages = this.config.pagination?.maxPages || 3;

        while (currentPage <= maxPages) {
          logger.info(`Scraping page ${currentPage} of ${this.config.portal}`);

          try {
            // Wait for job listings to load
            await this.page.waitForSelector(this.config.selectors.jobContainer, { timeout: 20000 });
            
            // Get all job containers on the current page
            const jobElements = await this.page.$$(this.config.selectors.jobContainer);
            logger.info(`Found ${jobElements.length} job listings on page ${currentPage}`);

            // Extract data from each job listing
            for (const jobElement of jobElements) {
              try {
                const jobData = await this.extractJobData(jobElement);
                if (jobData) {
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
      } catch (error) {
        logger.warn(`Could not access main university jobs portal: ${error}`);
        result.errors.push(`Main portal error: ${error}`);
        
        // For MVP, we'll just log this and continue
        // In production, you would implement individual university scrapers
        logger.info('University scraping would require individual portal implementations');
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
   * Override extractJobData for University-specific logic
   */
  protected async extractJobData(element: any): Promise<Partial<JobListing> | null> {
    const baseData = await super.extractJobData(element);
    if (!baseData) return null;

    try {
      // University-specific enhancements
      // Extract application deadline
      const deadlineElement = await element.$(this.config.selectors.deadline || '');
      if (deadlineElement) {
        const deadlineText = await deadlineElement.textContent();
        if (deadlineText && deadlineText.trim()) {
          baseData.description += `\nApplication Deadline: ${deadlineText.trim()}`;
          
          // Try to parse the deadline date
          const dateMatch = deadlineText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/);
          if (dateMatch) {
            try {
              baseData.applicationDeadline = new Date(dateMatch[0]);
            } catch (e) {
              // Ignore date parsing errors
            }
          }
        }
      }

      // Set job category for university jobs
      baseData.jobCategory = 'Education';
      
      // Extract department/faculty info
      const deptElement = await element.$('.department, .faculty');
      if (deptElement) {
        const deptText = await deptElement.textContent();
        if (deptText) {
          baseData.description += `\nDepartment: ${deptText.trim()}`;
        }
      }

      return baseData;
    } catch (error) {
      logger.error('Error in University-specific extraction:', error);
      return baseData;
    }
  }
}
