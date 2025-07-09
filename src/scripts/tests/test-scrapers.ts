import { ScraperManager } from '../scrapers/scraper-manager';
import { JobService } from '../services/job.service';
import logger from '../utils/logger';

/**
 * Test script to verify scraper functionality
 */
async function testScrapers() {
  logger.info('Starting scraper test...');
  
  const scraperManager = new ScraperManager();
  const jobService = new JobService();
  
  // Get initial job count
  const initialStats = await jobService.getScrapingStats();
  logger.info('Initial database stats:', initialStats);
  
  // Test individual scrapers
  const scrapers = ['jobsdb', 'recruit'];
  
  for (const scraperName of scrapers) {
    logger.info(`\n${'='.repeat(50)}`);
    logger.info(`Testing ${scraperName} scraper`);
    logger.info('='.repeat(50));
    
    try {
      const result = await scraperManager.runScraper(scraperName);
      
      logger.info(`\nResults for ${scraperName}:`);
      logger.info(`- Success: ${result.success}`);
      logger.info(`- Jobs scraped: ${result.jobsScraped}`);
      logger.info(`- New jobs: ${result.jobsNew}`);
      logger.info(`- Updated jobs: ${result.jobsUpdated}`);
      logger.info(`- Duration: ${result.duration}s`);
      
      if (result.errors.length > 0) {
        logger.error(`- Errors: ${result.errors.join(', ')}`);
      }
      
      // Verify data quality
      if (result.jobsScraped > 0) {
        const latestJobs = await jobService.getJobs({
          portal: scraperName,
          limit: 5
        });
        
        logger.info(`\nSample jobs from ${scraperName}:`);
        latestJobs.data.forEach((job, index) => {
          logger.info(`${index + 1}. ${job.title} at ${job.company}`);
          logger.info(`   Location: ${job.location}`);
          logger.info(`   URL: ${job.originalUrl}`);
        });
      }
      
    } catch (error) {
      logger.error(`Failed to test ${scraperName}:`, error);
    }
    
    // Delay between scrapers
    logger.info('\nWaiting before next scraper...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Final stats
  const finalStats = await jobService.getScrapingStats();
  logger.info('\n' + '='.repeat(50));
  logger.info('Test completed. Final database stats:');
  logger.info(`- Total jobs: ${finalStats.totalJobs}`);
  logger.info(`- Active jobs: ${finalStats.activeJobs}`);
  logger.info(`- Jobs by portal:`);
  Object.entries(finalStats.jobsByPortal).forEach(([portal, count]) => {
    logger.info(`  - ${portal}: ${count}`);
  });
  
  // Check for fake data
  logger.info('\nChecking data quality...');
  const allJobs = await jobService.getJobs({ limit: 100 });
  
  let realJobs = 0;
  let fakeJobs = 0;
  
  allJobs.data.forEach(job => {
    // Check for fake data patterns
    if (job.company.match(/Company \d+/) || 
        job.description.includes('Exciting') ||
        job.description.includes('opportunity in') ||
        !job.originalUrl.includes('http')) {
      fakeJobs++;
    } else {
      realJobs++;
    }
  });
  
  logger.info(`- Real jobs: ${realJobs}`);
  logger.info(`- Fake/generated jobs: ${fakeJobs}`);
  
  process.exit(0);
}

// Run the test
testScrapers().catch(error => {
  logger.error('Test script failed:', error);
  process.exit(1);
});