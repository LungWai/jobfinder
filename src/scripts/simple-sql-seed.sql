-- Simple SQL script to populate job listings
-- This can be run directly against the SQLite database

-- Clear existing data (optional)
-- DELETE FROM job_listings;
-- DELETE FROM scraping_logs;

-- Insert sample job listings
INSERT OR REPLACE INTO job_listings (
  id, title, company, location, description, requirements, benefits,
  salaryMin, salaryMax, salaryCurrency, sourcePortal, jobCategory,
  employmentType, experienceLevel, originalUrl, contentHash,
  isActive, createdAt, updatedAt, lastScrapedAt, scrapedCount
) VALUES 
(
  'job_001',
  'Software Engineer',
  'Tech Solutions HK',
  'Central, Hong Kong',
  'We are looking for a talented Software Engineer to join our dynamic team. You will be responsible for developing and maintaining web applications using modern technologies.',
  'Bachelor''s degree in Computer Science, 2+ years experience with JavaScript/TypeScript, React, Node.js',
  'Competitive salary, health insurance, flexible working hours, professional development opportunities',
  25000, 35000, 'HKD', 'JobsDB', 'Information Technology',
  'Full-time', 'Mid-level', 'https://hk.jobsdb.com/job/software-engineer-123456',
  'hash_001', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_002',
  'Frontend Developer',
  'Digital Agency Ltd',
  'Tsim Sha Tsui, Hong Kong',
  'Join our creative team as a Frontend Developer. You''ll work on exciting projects for international clients, creating beautiful and responsive user interfaces.',
  '3+ years experience with React, Vue.js or Angular, HTML5, CSS3, JavaScript ES6+',
  'Medical coverage, annual bonus, team building activities, modern office environment',
  22000, 32000, 'HKD', 'CT Good Jobs', 'Information Technology',
  'Full-time', 'Mid-level', 'https://goodjobs.com.hk/job/frontend-developer-789012',
  'hash_002', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_003',
  'Data Analyst',
  'Financial Services Corp',
  'Admiralty, Hong Kong',
  'We are seeking a detail-oriented Data Analyst to help us make data-driven decisions. You will analyze large datasets and create insightful reports.',
  'Bachelor''s degree in Statistics, Mathematics, or related field, SQL, Python, Excel proficiency',
  'Performance bonus, training budget, health insurance, retirement plan',
  20000, 28000, 'HKD', 'Recruit', 'Finance',
  'Full-time', 'Entry-level', 'https://recruit.com.hk/job/data-analyst-345678',
  'hash_003', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_004',
  'Marketing Manager',
  'Retail Chain HK',
  'Causeway Bay, Hong Kong',
  'Lead our marketing initiatives and drive brand awareness. You''ll develop marketing strategies and manage campaigns across multiple channels.',
  '5+ years marketing experience, digital marketing expertise, team leadership skills',
  'Attractive package, staff discount, career advancement opportunities, flexible schedule',
  35000, 45000, 'HKD', 'JobsDB', 'Marketing',
  'Full-time', 'Senior-level', 'https://hk.jobsdb.com/job/marketing-manager-901234',
  'hash_004', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_005',
  'UX/UI Designer',
  'Startup Innovation Lab',
  'Wan Chai, Hong Kong',
  'Design intuitive and engaging user experiences for our mobile and web applications. Work closely with product and engineering teams.',
  'Portfolio showcasing UX/UI work, Figma/Sketch proficiency, user research experience',
  'Stock options, creative freedom, modern workspace, learning budget',
  24000, 34000, 'HKD', 'CT Good Jobs', 'Design',
  'Full-time', 'Mid-level', 'https://goodjobs.com.hk/job/ux-ui-designer-567890',
  'hash_005', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_006',
  'Project Manager',
  'Construction Group Ltd',
  'Kowloon, Hong Kong',
  'Manage construction projects from planning to completion. Coordinate with contractors, suppliers, and stakeholders to ensure timely delivery.',
  'PMP certification preferred, 4+ years project management experience, construction industry knowledge',
  'Project completion bonuses, company car, comprehensive insurance, career progression',
  30000, 40000, 'HKD', 'Recruit', 'Construction',
  'Full-time', 'Senior-level', 'https://recruit.com.hk/job/project-manager-123789',
  'hash_006', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_007',
  'Sales Representative',
  'Electronics Distributor',
  'Mong Kok, Hong Kong',
  'Drive sales growth by building relationships with clients and identifying new business opportunities in the electronics sector.',
  'Sales experience, excellent communication skills, Cantonese and English fluency',
  'Commission structure, sales incentives, travel opportunities, training programs',
  18000, 25000, 'HKD', 'JobsDB', 'Sales',
  'Full-time', 'Entry-level', 'https://hk.jobsdb.com/job/sales-representative-456123',
  'hash_007', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_008',
  'Accountant',
  'Professional Services Firm',
  'Central, Hong Kong',
  'Handle full set of accounts, prepare financial statements, and ensure compliance with local regulations. Great opportunity for career growth.',
  'ACCA/CPA qualification, 3+ years accounting experience, knowledge of Hong Kong tax law',
  'Study leave, professional development, medical insurance, annual leave',
  22000, 30000, 'HKD', 'CT Good Jobs', 'Accounting',
  'Full-time', 'Mid-level', 'https://goodjobs.com.hk/job/accountant-789456',
  'hash_008', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_009',
  'Customer Service Officer',
  'Telecommunications Company',
  'Quarry Bay, Hong Kong',
  'Provide excellent customer service through phone, email, and chat support. Help customers with inquiries and resolve issues promptly.',
  'Customer service experience, bilingual (Cantonese/English), patience and problem-solving skills',
  'Shift allowance, medical coverage, staff mobile plan, career development',
  16000, 22000, 'HKD', 'Recruit', 'Customer Service',
  'Full-time', 'Entry-level', 'https://recruit.com.hk/job/customer-service-654321',
  'hash_009', 1, datetime('now'), datetime('now'), datetime('now'), 1
),
(
  'job_010',
  'DevOps Engineer',
  'Cloud Solutions Ltd',
  'Science Park, Hong Kong',
  'Build and maintain CI/CD pipelines, manage cloud infrastructure, and ensure system reliability and scalability.',
  'AWS/Azure experience, Docker, Kubernetes, Infrastructure as Code, monitoring tools',
  'Remote work options, certification support, tech conference budget, competitive salary',
  35000, 50000, 'HKD', 'JobsDB', 'Information Technology',
  'Full-time', 'Senior-level', 'https://hk.jobsdb.com/job/devops-engineer-987654',
  'hash_010', 1, datetime('now'), datetime('now'), datetime('now'), 1
);

-- Insert a scraping log entry
INSERT INTO scraping_logs (
  id, portal, status, jobsScraped, jobsNew, jobsUpdated,
  startTime, endTime, duration, createdAt
) VALUES (
  'log_001', 'Manual SQL Seed', 'SUCCESS', 10, 10, 0,
  datetime('now'), datetime('now'), 1, datetime('now')
);

-- Verify the data
SELECT 'Jobs inserted:' as info, COUNT(*) as count FROM job_listings WHERE isActive = 1;
SELECT 'Portals represented:' as info, COUNT(DISTINCT sourcePortal) as count FROM job_listings WHERE isActive = 1;
SELECT 'Categories represented:' as info, COUNT(DISTINCT jobCategory) as count FROM job_listings WHERE isActive = 1;
