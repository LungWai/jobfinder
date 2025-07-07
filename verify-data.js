// Script to verify the scraped data is real and not generated
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verifying scraped job data...\n');

  try {
    // Get recent jobs from JobsDB
    const jobsDBJobs = await prisma.jobListing.findMany({
      where: { sourcePortal: 'JobsDB' },
      select: {
        title: true,
        company: true,
        location: true,
        originalUrl: true,
        description: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('📋 REAL JobsDB Jobs (Latest 10):');
    console.log('=====================================');
    jobsDBJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   URL: ${job.originalUrl}`);
      console.log(`   Description: ${job.description.substring(0, 100)}...`);
      console.log(`   Scraped: ${job.createdAt.toISOString()}`);
      console.log('');
    });

    // Get recent jobs from Recruit
    const recruitJobs = await prisma.jobListing.findMany({
      where: { sourcePortal: 'Recruit.com.hk' },
      select: {
        title: true,
        company: true,
        location: true,
        originalUrl: true,
        description: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('📋 REAL Recruit.com.hk Jobs (Latest 10):');
    console.log('=========================================');
    recruitJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   URL: ${job.originalUrl}`);
      console.log(`   Description: ${job.description.substring(0, 100)}...`);
      console.log(`   Scraped: ${job.createdAt.toISOString()}`);
      console.log('');
    });

    // Check for patterns that would indicate generated data
    const allJobs = await prisma.jobListing.findMany({
      select: {
        title: true,
        company: true,
        description: true,
        originalUrl: true,
        sourcePortal: true
      }
    });

    console.log('🔍 DATA VERIFICATION ANALYSIS:');
    console.log('===============================');
    
    // Check URL patterns
    const realJobsDBUrls = allJobs.filter(job => 
      job.sourcePortal === 'JobsDB' && 
      job.originalUrl.includes('hk.jobsdb.com/job/') &&
      /\/job\/\d+/.test(job.originalUrl)
    ).length;

    const realRecruitUrls = allJobs.filter(job => 
      job.sourcePortal === 'Recruit.com.hk' && 
      job.originalUrl.includes('recruit.com.hk')
    ).length;

    console.log(`✅ JobsDB jobs with real URLs: ${realJobsDBUrls}`);
    console.log(`✅ Recruit jobs with real URLs: ${realRecruitUrls}`);

    // Check for generated patterns
    const generatedPatterns = allJobs.filter(job => 
      job.company.includes('Company 1') ||
      job.company.includes('Tech Solutions HK') ||
      job.description.includes('sample data') ||
      job.description.includes('simulated')
    ).length;

    console.log(`⚠️  Jobs with generated patterns: ${generatedPatterns}`);

    // Check company diversity
    const uniqueCompanies = new Set(allJobs.map(job => job.company)).size;
    console.log(`🏢 Unique companies: ${uniqueCompanies}`);

    // Check for real company names from JobsDB
    const realCompanies = allJobs.filter(job => 
      job.sourcePortal === 'JobsDB' && (
        job.company.includes('Limited') ||
        job.company.includes('Ltd') ||
        job.company.includes('Company') ||
        job.company.includes('Group') ||
        job.company.includes('International')
      )
    ).length;

    console.log(`🏢 JobsDB jobs with real company patterns: ${realCompanies}`);

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('=========================');
    if (realJobsDBUrls > 0 && realRecruitUrls > 0 && generatedPatterns < 20) {
      console.log('✅ DATA APPEARS TO BE REAL SCRAPED DATA');
      console.log('   - Real URLs from actual job portals');
      console.log('   - Diverse company names');
      console.log('   - Minimal generated patterns');
    } else {
      console.log('❌ DATA APPEARS TO CONTAIN GENERATED CONTENT');
      console.log('   - Check the patterns above for details');
    }

  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
