import { WebFetchScraper } from './web-fetch-scraper';
import { JobService } from '../database/job-service';
import { ScrapingResult } from '../types/job';
import logger from '../utils/logger';

export class ScraperManager {
  private jobService: JobService;
  private webFetchScraper: WebFetchScraper;

  constructor() {
    this.jobService = new JobService();
    this.webFetchScraper = new WebFetchScraper();
  }

  /**
   * Run a specific scraper
   */
  async runScraper(scraperName: string): Promise<ScrapingResult> {
    try {
      logger.info(`Running ${scraperName} scraper`);

      let result: ScrapingResult;

      switch (scraperName.toLowerCase()) {
        case 'jobsdb':
          result = await this.webFetchScraper.scrapeJobsDB();
          break;
        case 'recruit':
          result = await this.webFetchScraper.scrapeRecruit();
          break;
        default:
          throw new Error(`Scraper '${scraperName}' not supported. Available: jobsdb, recruit`);
      }

      // Log the result
      await this.jobService.logScrapingResult(result);

      return result;
    } catch (error) {
      logger.error(`Error running ${scraperName} scraper:`, error);

      const errorResult: ScrapingResult = {
        success: false,
        jobsScraped: 0,
        jobsNew: 0,
        jobsUpdated: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        portal: scraperName,
        duration: 0
      };

      await this.jobService.logScrapingResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Run all scrapers
   */
  async runAllScrapers(): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const scraperNames = ['jobsdb', 'recruit'];

    logger.info('Starting all scrapers');

    for (const name of scraperNames) {
      try {
        logger.info(`Running ${name} scraper`);
        const result = await this.runScraper(name);
        results.push(result);

        // Add delay between scrapers to be respectful
        await this.delay(5000);

      } catch (error) {
        logger.error(`Error running ${name} scraper:`, error);

        const errorResult: ScrapingResult = {
          success: false,
          jobsScraped: 0,
          jobsNew: 0,
          jobsUpdated: 0,
          errors: [`Fatal error: ${error}`],
          portal: name,
          duration: 0
        };

        results.push(errorResult);
        await this.jobService.logScrapingResult(errorResult);
      }
    }

    // Summary
    const totalJobs = results.reduce((sum, result) => sum + result.jobsScraped, 0);
    const successfulScrapers = results.filter(result => result.success).length;

    logger.info(`Scraping completed. Total jobs: ${totalJobs}, Successful scrapers: ${successfulScrapers}/${results.length}`);

    return results;
  }

  /**
   * Get available scrapers
   */
  getAvailableScrapers(): string[] {
    return ['jobsdb', 'recruit'];
  }

  /**
   * Add delay between operations
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run scrapers with concurrency control
   */
  async runScrapersWithConcurrency(scraperNames: string[], maxConcurrent: number = 2): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const chunks = this.chunkArray(scraperNames, maxConcurrent);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(name => this.runScraper(name));
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Scraper ${chunk[index]} failed:`, result.reason);
          const errorResult: ScrapingResult = {
            success: false,
            jobsScraped: 0,
            jobsNew: 0,
            jobsUpdated: 0,
            errors: [`Fatal error: ${result.reason}`],
            portal: chunk[index],
            duration: 0
          };
          results.push(errorResult);
        }
      });
      
      // Delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(10000); // 10 second delay between chunks
      }
    }
    
    return results;
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
