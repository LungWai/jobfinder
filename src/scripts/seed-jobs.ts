#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { generateJobHash } from '../utils/hash';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Sample job data
const sampleJobs = [
  {
    title: "Software Engineer",
    company: "Tech Solutions HK",
    location: "Central, Hong Kong",
    description: "We are looking for a talented Software Engineer to join our dynamic team. You will be responsible for developing and maintaining web applications using modern technologies.",
    requirements: "Bachelor's degree in Computer Science, 2+ years experience with JavaScript/TypeScript, React, Node.js",
    benefits: "Competitive salary, health insurance, flexible working hours, professional development opportunities",
    salaryMin: 25000,
    salaryMax: 35000,
    salaryCurrency: "HKD",
    sourcePortal: "JobsDB",
    jobCategory: "Information Technology",
    employmentType: "Full-time",
    experienceLevel: "Mid-level",
    originalUrl: "https://hk.jobsdb.com/job/software-engineer-123456"
  },
  {
    title: "Frontend Developer",
    company: "Digital Agency Ltd",
    location: "Tsim Sha Tsui, Hong Kong",
    description: "Join our creative team as a Frontend Developer. You'll work on exciting projects for international clients, creating beautiful and responsive user interfaces.",
    requirements: "3+ years experience with React, Vue.js or Angular, HTML5, CSS3, JavaScript ES6+",
    benefits: "Medical coverage, annual bonus, team building activities, modern office environment",
    salaryMin: 22000,
    salaryMax: 32000,
    salaryCurrency: "HKD",
    sourcePortal: "CT Good Jobs",
    jobCategory: "Information Technology",
    employmentType: "Full-time",
    experienceLevel: "Mid-level",
    originalUrl: "https://goodjobs.com.hk/job/frontend-developer-789012"
  },
  {
    title: "Data Analyst",
    company: "Financial Services Corp",
    location: "Admiralty, Hong Kong",
    description: "We are seeking a detail-oriented Data Analyst to help us make data-driven decisions. You will analyze large datasets and create insightful reports.",
    requirements: "Bachelor's degree in Statistics, Mathematics, or related field, SQL, Python, Excel proficiency",
    benefits: "Performance bonus, training budget, health insurance, retirement plan",
    salaryMin: 20000,
    salaryMax: 28000,
    salaryCurrency: "HKD",
    sourcePortal: "Recruit",
    jobCategory: "Finance",
    employmentType: "Full-time",
    experienceLevel: "Entry-level",
    originalUrl: "https://recruit.com.hk/job/data-analyst-345678"
  },
  {
    title: "Marketing Manager",
    company: "Retail Chain HK",
    location: "Causeway Bay, Hong Kong",
    description: "Lead our marketing initiatives and drive brand awareness. You'll develop marketing strategies and manage campaigns across multiple channels.",
    requirements: "5+ years marketing experience, digital marketing expertise, team leadership skills",
    benefits: "Attractive package, staff discount, career advancement opportunities, flexible schedule",
    salaryMin: 35000,
    salaryMax: 45000,
    salaryCurrency: "HKD",
    sourcePortal: "JobsDB",
    jobCategory: "Marketing",
    employmentType: "Full-time",
    experienceLevel: "Senior-level",
    originalUrl: "https://hk.jobsdb.com/job/marketing-manager-901234"
  },
  {
    title: "UX/UI Designer",
    company: "Startup Innovation Lab",
    location: "Wan Chai, Hong Kong",
    description: "Design intuitive and engaging user experiences for our mobile and web applications. Work closely with product and engineering teams.",
    requirements: "Portfolio showcasing UX/UI work, Figma/Sketch proficiency, user research experience",
    benefits: "Stock options, creative freedom, modern workspace, learning budget",
    salaryMin: 24000,
    salaryMax: 34000,
    salaryCurrency: "HKD",
    sourcePortal: "CT Good Jobs",
    jobCategory: "Design",
    employmentType: "Full-time",
    experienceLevel: "Mid-level",
    originalUrl: "https://goodjobs.com.hk/job/ux-ui-designer-567890"
  },
  {
    title: "Project Manager",
    company: "Construction Group Ltd",
    location: "Kowloon, Hong Kong",
    description: "Manage construction projects from planning to completion. Coordinate with contractors, suppliers, and stakeholders to ensure timely delivery.",
    requirements: "PMP certification preferred, 4+ years project management experience, construction industry knowledge",
    benefits: "Project completion bonuses, company car, comprehensive insurance, career progression",
    salaryMin: 30000,
    salaryMax: 40000,
    salaryCurrency: "HKD",
    sourcePortal: "Recruit",
    jobCategory: "Construction",
    employmentType: "Full-time",
    experienceLevel: "Senior-level",
    originalUrl: "https://recruit.com.hk/job/project-manager-123789"
  },
  {
    title: "Sales Representative",
    company: "Electronics Distributor",
    location: "Mong Kok, Hong Kong",
    description: "Drive sales growth by building relationships with clients and identifying new business opportunities in the electronics sector.",
    requirements: "Sales experience, excellent communication skills, Cantonese and English fluency",
    benefits: "Commission structure, sales incentives, travel opportunities, training programs",
    salaryMin: 18000,
    salaryMax: 25000,
    salaryCurrency: "HKD",
    sourcePortal: "JobsDB",
    jobCategory: "Sales",
    employmentType: "Full-time",
    experienceLevel: "Entry-level",
    originalUrl: "https://hk.jobsdb.com/job/sales-representative-456123"
  },
  {
    title: "Accountant",
    company: "Professional Services Firm",
    location: "Central, Hong Kong",
    description: "Handle full set of accounts, prepare financial statements, and ensure compliance with local regulations. Great opportunity for career growth.",
    requirements: "ACCA/CPA qualification, 3+ years accounting experience, knowledge of Hong Kong tax law",
    benefits: "Study leave, professional development, medical insurance, annual leave",
    salaryMin: 22000,
    salaryMax: 30000,
    salaryCurrency: "HKD",
    sourcePortal: "CT Good Jobs",
    jobCategory: "Accounting",
    employmentType: "Full-time",
    experienceLevel: "Mid-level",
    originalUrl: "https://goodjobs.com.hk/job/accountant-789456"
  },
  {
    title: "Customer Service Officer",
    company: "Telecommunications Company",
    location: "Quarry Bay, Hong Kong",
    description: "Provide excellent customer service through phone, email, and chat support. Help customers with inquiries and resolve issues promptly.",
    requirements: "Customer service experience, bilingual (Cantonese/English), patience and problem-solving skills",
    benefits: "Shift allowance, medical coverage, staff mobile plan, career development",
    salaryMin: 16000,
    salaryMax: 22000,
    salaryCurrency: "HKD",
    sourcePortal: "Recruit",
    jobCategory: "Customer Service",
    employmentType: "Full-time",
    experienceLevel: "Entry-level",
    originalUrl: "https://recruit.com.hk/job/customer-service-654321"
  },
  {
    title: "DevOps Engineer",
    company: "Cloud Solutions Ltd",
    location: "Science Park, Hong Kong",
    description: "Build and maintain CI/CD pipelines, manage cloud infrastructure, and ensure system reliability and scalability.",
    requirements: "AWS/Azure experience, Docker, Kubernetes, Infrastructure as Code, monitoring tools",
    benefits: "Remote work options, certification support, tech conference budget, competitive salary",
    salaryMin: 35000,
    salaryMax: 50000,
    salaryCurrency: "HKD",
    sourcePortal: "JobsDB",
    jobCategory: "Information Technology",
    employmentType: "Full-time",
    experienceLevel: "Senior-level",
    originalUrl: "https://hk.jobsdb.com/job/devops-engineer-987654"
  }
];

async function seedJobs() {
  try {
    logger.info('Starting to seed job data...');

    let newJobs = 0;
    let updatedJobs = 0;

    for (const jobData of sampleJobs) {
      // Generate content hash for deduplication
      const contentHash = generateJobHash(jobData);
      
      // Check if job already exists
      const existingJob = await prisma.jobListing.findUnique({
        where: { contentHash }
      });

      if (existingJob) {
        // Update existing job
        await prisma.jobListing.update({
          where: { id: existingJob.id },
          data: {
            ...jobData,
            contentHash,
            lastScrapedAt: new Date(),
            scrapedCount: existingJob.scrapedCount + 1,
            updatedAt: new Date()
          }
        });
        updatedJobs++;
        logger.info(`Updated job: ${jobData.title} at ${jobData.company}`);
      } else {
        // Create new job
        await prisma.jobListing.create({
          data: {
            ...jobData,
            contentHash,
            lastScrapedAt: new Date(),
            isActive: true
          }
        });
        newJobs++;
        logger.info(`Created new job: ${jobData.title} at ${jobData.company}`);
      }
    }

    // Log the seeding result
    await prisma.scrapingLog.create({
      data: {
        portal: 'Manual Seed',
        status: 'SUCCESS',
        jobsScraped: sampleJobs.length,
        jobsNew: newJobs,
        jobsUpdated: updatedJobs,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1
      }
    });

    logger.info(`Seeding completed successfully!`);
    logger.info(`New jobs: ${newJobs}, Updated jobs: ${updatedJobs}`);

  } catch (error) {
    logger.error('Error seeding jobs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedJobs()
    .then(() => {
      logger.info('Job seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job seeding process failed:', error);
      process.exit(1);
    });
}

export { seedJobs };
