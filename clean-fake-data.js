// Script to remove generated/fake data and keep only real scraped data
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanFakeData() {
  console.log('🧹 Cleaning fake/generated data from database...\n');

  try {
    // Delete all Recruit.com.hk jobs (they were generated)
    const deletedRecruit = await prisma.jobListing.deleteMany({
      where: { sourcePortal: 'Recruit.com.hk' }
    });

    console.log(`❌ Deleted ${deletedRecruit.count} generated Recruit.com.hk jobs`);

    // Delete any jobs with generated patterns
    const deletedGenerated = await prisma.jobListing.deleteMany({
      where: {
        OR: [
          { company: { contains: 'Company 1' } },
          { company: { contains: 'Tech Solutions HK' } },
          { description: { contains: 'sample data' } },
          { description: { contains: 'simulated' } },
          { description: { contains: 'Exciting' } },
          { description: { contains: 'opportunity in' } }
        ]
      }
    });

    console.log(`❌ Deleted ${deletedGenerated.count} jobs with generated patterns`);

    // Delete scraping logs for fake data
    const deletedLogs = await prisma.scrapingLog.deleteMany({
      where: {
        OR: [
          { portal: 'Recruit.com.hk' },
          { portal: 'Manual Seed' },
          { portal: 'Manual SQL Seed' }
        ]
      }
    });

    console.log(`❌ Deleted ${deletedLogs.count} fake scraping logs`);

    // Count remaining real jobs
    const remainingJobs = await prisma.jobListing.count({
      where: { isActive: true }
    });

    const jobsByPortal = await prisma.jobListing.groupBy({
      by: ['sourcePortal'],
      _count: { id: true },
      where: { isActive: true }
    });

    console.log('\n✅ CLEANUP COMPLETE');
    console.log('===================');
    console.log(`📊 Remaining REAL jobs: ${remainingJobs}`);
    console.log('\n📋 Jobs by portal:');
    jobsByPortal.forEach(portal => {
      console.log(`   ${portal.sourcePortal}: ${portal._count.id} jobs`);
    });

    // Verify no fake patterns remain
    const fakePatterns = await prisma.jobListing.count({
      where: {
        OR: [
          { company: { contains: 'Company 1' } },
          { description: { contains: 'Exciting' } }
        ]
      }
    });

    if (fakePatterns === 0) {
      console.log('\n✅ No fake patterns detected - database is clean!');
    } else {
      console.log(`\n⚠️  Warning: ${fakePatterns} jobs still have fake patterns`);
    }

  } catch (error) {
    console.error('❌ Error cleaning fake data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanFakeData();
