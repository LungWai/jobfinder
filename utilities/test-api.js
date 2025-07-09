// Simple test script to verify the API is working
const http = require('http');

function testAPI(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing Job Finder API...\n');

  try {
    // Test 1: Get all jobs
    console.log('1. Testing GET /api/jobs');
    const jobsResponse = await testAPI('/api/jobs');
    console.log(`   Status: ${jobsResponse.status}`);
    console.log(`   Total jobs: ${jobsResponse.data.total}`);
    console.log(`   Jobs on page: ${jobsResponse.data.data.length}`);
    
    if (jobsResponse.data.data.length > 0) {
      const firstJob = jobsResponse.data.data[0];
      console.log(`   First job: ${firstJob.title} at ${firstJob.company}`);
    }
    console.log('');

    // Test 2: Get scraping status
    console.log('2. Testing GET /api/scraping/status');
    const statusResponse = await testAPI('/api/scraping/status');
    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Total jobs: ${statusResponse.data.totalJobs}`);
    console.log(`   Portals: ${statusResponse.data.jobsByPortal.length}`);
    console.log('');

    // Test 3: Search jobs
    console.log('3. Testing GET /api/jobs?search=engineer');
    const searchResponse = await testAPI('/api/jobs?search=engineer');
    console.log(`   Status: ${searchResponse.status}`);
    console.log(`   Search results: ${searchResponse.data.total}`);
    console.log('');

    // Test 4: Filter by category
    console.log('4. Testing GET /api/jobs?category=Information Technology');
    const categoryResponse = await testAPI('/api/jobs?category=Information%20Technology');
    console.log(`   Status: ${categoryResponse.status}`);
    console.log(`   IT jobs: ${categoryResponse.data.total}`);
    console.log('');

    console.log('✅ All API tests completed successfully!');
    console.log('\nYou can now:');
    console.log('- Visit http://localhost:3002/api/jobs to see all jobs');
    console.log('- Visit http://localhost:5555 to open Prisma Studio (if running)');
    console.log('- Start the frontend with: npm run dev:client');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

runTests();
