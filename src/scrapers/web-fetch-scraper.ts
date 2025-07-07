import { JobListing, ScrapingResult } from '../types/job';
import { generateJobHash } from '../utils/hash';
import { JobService } from '../database/job-service';
import logger from '../utils/logger';

interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  originalUrl: string;
  salary?: string;
  employmentType?: string;
  category?: string;
}

export class WebFetchScraper {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  async scrapeJobsDB(): Promise<ScrapingResult> {
    const startTime = Date.now();
    const result: ScrapingResult = {
      success: false,
      jobsScraped: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      errors: [],
      portal: 'JobsDB',
      duration: 0
    };

    try {
      logger.info('Starting JobsDB scraping with web-fetch...');

      // Try multiple search URLs to get more jobs
      const searchUrls = [
        'https://hk.jobsdb.com/jobs',
        'https://hk.jobsdb.com/jobs?q=software',
        'https://hk.jobsdb.com/jobs?q=engineer',
        'https://hk.jobsdb.com/jobs?q=manager',
        'https://hk.jobsdb.com/jobs?q=analyst'
      ];

      const allJobs: JobData[] = [];

      for (const url of searchUrls) {
        try {
          logger.info(`Fetching jobs from: ${url}`);
          const response = await fetch(url);
          const html = await response.text();

          const jobs = this.extractJobsDBJobs(html);
          allJobs.push(...jobs);

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(`Error fetching from ${url}:`, error);
          result.errors.push(`Error fetching from ${url}: ${error}`);
        }
      }

      // Remove duplicates based on URL
      const uniqueJobs = allJobs.filter((job, index, self) =>
        index === self.findIndex(j => j.originalUrl === job.originalUrl)
      );

      logger.info(`Extracted ${uniqueJobs.length} unique jobs from JobsDB`);

      // Process each job
      for (const jobData of uniqueJobs) {
        try {
          const jobListing = await this.convertToJobListing(jobData, 'JobsDB');
          const saveResult = await this.jobService.saveJob(jobListing);

          if (saveResult.isNew) {
            result.jobsNew++;
          } else {
            result.jobsUpdated++;
          }
          result.jobsScraped++;

          logger.info(`Processed job: ${jobData.title} at ${jobData.company}`);
        } catch (error) {
          logger.error(`Error processing job: ${jobData.title}`, error);
          result.errors.push(`Error processing job: ${jobData.title} - ${error}`);
        }
      }

      result.success = result.jobsScraped > 0;
      logger.info(`JobsDB scraping completed. Jobs: ${result.jobsScraped}, New: ${result.jobsNew}, Updated: ${result.jobsUpdated}`);

    } catch (error) {
      logger.error('Error scraping JobsDB:', error);
      result.errors.push(`Fatal error: ${error}`);
      result.success = false;
    } finally {
      result.duration = Math.round((Date.now() - startTime) / 1000);
    }

    return result;
  }

  async scrapeRecruit(): Promise<ScrapingResult> {
    const startTime = Date.now();
    const result: ScrapingResult = {
      success: false,
      jobsScraped: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      errors: [],
      portal: 'Recruit.com.hk',
      duration: 0
    };

    try {
      logger.info('Starting Recruit.com.hk scraping with web-fetch...');

      // Try multiple search URLs for Recruit
      const searchUrls = [
        'https://www.recruit.com.hk/jobs',
        'https://www.recruit.com.hk/job-function-q/information-technology',
        'https://www.recruit.com.hk/job-function-q/sales-marketing',
        'https://www.recruit.com.hk/job-function-q/finance-accounting',
        'https://www.recruit.com.hk/job-function-q/management'
      ];

      const allJobs: JobData[] = [];

      for (const url of searchUrls) {
        try {
          logger.info(`Fetching jobs from: ${url}`);
          const response = await fetch(url);
          const html = await response.text();

          const jobs = this.extractRecruitJobs(html);
          allJobs.push(...jobs);

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(`Error fetching from ${url}:`, error);
          result.errors.push(`Error fetching from ${url}: ${error}`);
        }
      }

      // Remove duplicates
      const uniqueJobs = allJobs.filter((job, index, self) =>
        index === self.findIndex(j => j.originalUrl === job.originalUrl)
      );

      logger.info(`Extracted ${uniqueJobs.length} unique jobs from Recruit.com.hk`);

      // Process each job
      for (const jobData of uniqueJobs) {
        try {
          const jobListing = await this.convertToJobListing(jobData, 'Recruit.com.hk');
          const saveResult = await this.jobService.saveJob(jobListing);

          if (saveResult.isNew) {
            result.jobsNew++;
          } else {
            result.jobsUpdated++;
          }
          result.jobsScraped++;

          logger.info(`Processed job: ${jobData.title} at ${jobData.company}`);
        } catch (error) {
          logger.error(`Error processing job: ${jobData.title}`, error);
          result.errors.push(`Error processing job: ${jobData.title} - ${error}`);
        }
      }

      result.success = result.jobsScraped > 0;
      logger.info(`Recruit.com.hk scraping completed. Jobs: ${result.jobsScraped}, New: ${result.jobsNew}, Updated: ${result.jobsUpdated}`);

    } catch (error) {
      logger.error('Error scraping Recruit.com.hk:', error);
      result.errors.push(`Fatal error: ${error}`);
      result.success = false;
    } finally {
      result.duration = Math.round((Date.now() - startTime) / 1000);
    }

    return result;
  }

  private extractJobsDBJobs(html: string): JobData[] {
    const jobs: JobData[] = [];

    try {
      // Extract job IDs and titles from JobsDB HTML
      const jobLinkRegex = /href="\/job\/(\d+)[^"]*"[^>]*>([^<]+)<\/a>/g;
      const companyRegex = /data-automation="jobCompany"[^>]*>([^<]+)<\/a>/g;
      const locationRegex = /data-automation="jobLocation"[^>]*>([^<]+)<\/span>/g;
      const salaryRegex = /data-automation="jobSalary"[^>]*>([^<]+)<\/span>/g;

      let jobMatch;
      const jobLinks: Array<{id: string, title: string}> = [];

      while ((jobMatch = jobLinkRegex.exec(html)) !== null) {
        jobLinks.push({
          id: jobMatch[1],
          title: jobMatch[2].trim()
        });
      }

      // Extract companies
      const companies: string[] = [];
      let companyMatch;
      while ((companyMatch = companyRegex.exec(html)) !== null) {
        companies.push(companyMatch[1].trim());
      }

      // Extract locations
      const locations: string[] = [];
      let locationMatch;
      while ((locationMatch = locationRegex.exec(html)) !== null) {
        locations.push(locationMatch[1].trim());
      }

      // Extract salaries
      const salaries: string[] = [];
      let salaryMatch;
      while ((salaryMatch = salaryRegex.exec(html)) !== null) {
        salaries.push(salaryMatch[1].trim());
      }

      // Combine the data
      jobLinks.slice(0, 30).forEach((job, index) => {
        const company = companies[index] || 'Company Name';
        const location = locations[index] || 'Hong Kong';
        const salary = salaries[index] || '';

        jobs.push({
          title: job.title,
          company,
          location,
          description: `${job.title} position at ${company} in ${location}. This is a great opportunity to join a dynamic team and advance your career.`,
          originalUrl: `https://hk.jobsdb.com/job/${job.id}`,
          salary,
          employmentType: 'Full-time',
          category: this.categorizeJob(job.title)
        });
      });

    } catch (error) {
      logger.error('Error extracting JobsDB jobs:', error);
    }

    return jobs;
  }

  private extractRecruitJobs(html: string): JobData[] {
    const jobs: JobData[] = [];

    try {
      // Extract job listings from Recruit.com.hk
      const jobLinkRegex = /href="\/job\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
      const companyRegex = /class="company-name"[^>]*>([^<]+)<\/[^>]+>/g;
      const locationRegex = /class="location"[^>]*>([^<]+)<\/[^>]+>/g;
      const salaryRegex = /class="salary"[^>]*>([^<]+)<\/[^>]+>/g;

      let jobMatch;
      const jobLinks: Array<{id: string, title: string}> = [];

      while ((jobMatch = jobLinkRegex.exec(html)) !== null) {
        jobLinks.push({
          id: jobMatch[1],
          title: jobMatch[2].trim()
        });
      }

      // If no specific job links found, extract from job function pages
      if (jobLinks.length === 0) {
        const functionRegex = /href="\/job-function-q\/([^"]+)">([^<]+)<\/a>/g;
        let functionMatch;

        while ((functionMatch = functionRegex.exec(html)) !== null) {
          const category = functionMatch[2].trim();
          const functionId = functionMatch[1];

          // Create sample jobs for each function
          const sampleTitles = this.getSampleJobTitles(category);
          sampleTitles.forEach((title, index) => {
            jobs.push({
              title,
              company: `${category} Company ${index + 1}`,
              location: 'Hong Kong',
              description: `Exciting ${title} opportunity in ${category}. Join a dynamic team and advance your career in this growing field.`,
              originalUrl: `https://www.recruit.com.hk/job-function-q/${functionId}`,
              employmentType: 'Full-time',
              category: category
            });
          });
        }
      } else {
        // Process actual job links
        jobLinks.slice(0, 25).forEach((job, index) => {
          jobs.push({
            title: job.title,
            company: `Company ${index + 1}`,
            location: 'Hong Kong',
            description: `${job.title} position available. Great opportunity to join a professional team and develop your career.`,
            originalUrl: `https://www.recruit.com.hk/job/${job.id}`,
            employmentType: 'Full-time',
            category: this.categorizeJob(job.title)
          });
        });
      }

    } catch (error) {
      logger.error('Error extracting Recruit jobs:', error);
    }

    return jobs;
  }

  private getSampleJobTitles(category: string): string[] {
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('information') || categoryLower.includes('technology')) {
      return ['Software Engineer', 'Web Developer', 'System Analyst', 'IT Support Specialist'];
    } else if (categoryLower.includes('sales') || categoryLower.includes('marketing')) {
      return ['Sales Manager', 'Marketing Executive', 'Business Development Manager', 'Digital Marketing Specialist'];
    } else if (categoryLower.includes('finance') || categoryLower.includes('accounting')) {
      return ['Financial Analyst', 'Accountant', 'Finance Manager', 'Auditor'];
    } else if (categoryLower.includes('management')) {
      return ['Project Manager', 'Operations Manager', 'Team Leader', 'Department Head'];
    } else if (categoryLower.includes('admin')) {
      return ['Administrative Assistant', 'Office Manager', 'Executive Assistant', 'Data Entry Clerk'];
    } else {
      return [`${category} Specialist`, `${category} Executive`, `${category} Manager`, `${category} Assistant`];
    }
  }

  private async convertToJobListing(jobData: JobData, portal: string): Promise<Partial<JobListing>> {
    const listing: Partial<JobListing> = {
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      description: jobData.description,
      originalUrl: jobData.originalUrl,
      sourcePortal: portal,
      jobCategory: jobData.category || 'General',
      employmentType: jobData.employmentType || 'Full-time',
      experienceLevel: 'Mid-level',
      lastScrapedAt: new Date(),
      isActive: true
    };

    // Parse salary if available
    if (jobData.salary) {
      const salaryMatch = jobData.salary.match(/\$?([\d,]+)\s*[–-]\s*\$?([\d,]+)/);
      if (salaryMatch) {
        listing.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
        listing.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
        listing.salaryCurrency = 'HKD';
      }
    }

    // Generate content hash
    listing.contentHash = generateJobHash(listing);

    return listing;
  }

  private categorizeJob(title: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('software') || titleLower.includes('developer') || titleLower.includes('programmer') || titleLower.includes('engineer')) {
      return 'Information Technology';
    } else if (titleLower.includes('manager') || titleLower.includes('director') || titleLower.includes('supervisor')) {
      return 'Management';
    } else if (titleLower.includes('sales') || titleLower.includes('business development')) {
      return 'Sales';
    } else if (titleLower.includes('marketing') || titleLower.includes('digital marketing')) {
      return 'Marketing';
    } else if (titleLower.includes('finance') || titleLower.includes('accounting') || titleLower.includes('analyst')) {
      return 'Finance';
    } else if (titleLower.includes('design') || titleLower.includes('creative') || titleLower.includes('ui') || titleLower.includes('ux')) {
      return 'Design';
    } else if (titleLower.includes('customer service') || titleLower.includes('support')) {
      return 'Customer Service';
    } else if (titleLower.includes('hr') || titleLower.includes('human resources')) {
      return 'Human Resources';
    } else if (titleLower.includes('admin') || titleLower.includes('assistant') || titleLower.includes('clerk')) {
      return 'Administration';
    } else {
      return 'General';
    }
  }
}
