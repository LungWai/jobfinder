import { JobsDBScraper } from './jobsdb-scraper';
import { RecruitScraper } from './recruit-scraper';
import { GoodJobsScraper } from './goodjobs-scraper';
import { UniversityScraper } from './university-scraper';
import { JobService } from '../services/job.service';
import { ScrapingResult } from '../types/job';
import { BaseScraper } from './base-scraper';
import logger from '../utils/logger';

export class ScraperManager {
  private jobService: JobService;
  private scrapers: Map<string, BaseScraper>;

  constructor() {
    this.jobService = new JobService();
    this.scrapers = new Map<string, BaseScraper>();
    
    // Initialize all available scrapers
    this.scrapers.set('jobsdb', new JobsDBScraper());
    this.scrapers.set('recruit', new RecruitScraper());
    this.scrapers.set('ctgoodjobs', new GoodJobsScraper());
    this.scrapers.set('university', new UniversityScraper());
  }

  /**
   * Run a specific scraper
   */
  async runScraper(scraperName: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Running ${scraperName} scraper`);

      const scraper = this.scrapers.get(scraperName.toLowerCase());
      if (!scraper) {
        const available = Array.from(this.scrapers.keys()).join(', ');
        throw new Error(`Scraper '${scraperName}' not supported. Available: ${available}`);
      }

      // Run the scraper
      const result = await scraper.scrape();

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
        duration: Math.round((Date.now() - startTime) / 1000)
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
    const scraperNames = Array.from(this.scrapers.keys());

    logger.info(`Starting all scrapers: ${scraperNames.join(', ')}`);

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
    return Array.from(this.scrapers.keys());
  }

  /**
   * Get scraper status
   */
  async getScraperStatus(): Promise<{ name: string; available: boolean }[]> {
    const status = [];
    for (const [name, scraper] of this.scrapers) {
      status.push({
        name,
        available: scraper !== null
      });
    }
    return status;
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
