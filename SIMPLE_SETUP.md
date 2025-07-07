# Simple SQL Setup for Job Finder

Since the web scraping is not working reliably, this guide shows you how to populate the database with sample job data using simple SQL commands.

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the automated setup script that will:
1. Generate Prisma client
2. Push database schema
3. Seed with sample job data

```bash
npm run setup
```

### Option 2: Manual Step-by-Step

1. **Generate Prisma client and setup database:**
   ```bash
   npm run db:generate
   npm run db:push
   ```

2. **Seed with sample data:**
   ```bash
   npm run seed
   ```

### Option 3: Direct SQL (Advanced)

If you prefer to run SQL directly:

1. **Setup database schema:**
   ```bash
   npm run db:push
   ```

2. **Run the SQL script:**
   ```bash
   # For SQLite (default)
   sqlite3 prisma/dev.db < src/scripts/simple-sql-seed.sql
   ```

### Option 4: API Endpoint

Once the server is running, you can also seed via API:

```bash
# Start the server
npm run dev

# In another terminal, trigger seeding
curl -X POST http://localhost:3001/api/scraping/seed
```

## What Gets Created

The seeding process creates 10 sample job listings with:

- **Companies:** Tech Solutions HK, Digital Agency Ltd, Financial Services Corp, etc.
- **Positions:** Software Engineer, Frontend Developer, Data Analyst, Marketing Manager, etc.
- **Locations:** Various Hong Kong locations (Central, Tsim Sha Tsui, Admiralty, etc.)
- **Categories:** IT, Finance, Marketing, Design, Construction, Sales, etc.
- **Salary Ranges:** Realistic HKD salary ranges for each position

## Verifying the Data

After seeding, you can verify the data:

1. **Via Prisma Studio:**
   ```bash
   npm run db:studio
   ```

2. **Via API:**
   ```bash
   curl http://localhost:3001/api/jobs
   ```

3. **Via SQLite CLI:**
   ```bash
   sqlite3 prisma/dev.db "SELECT COUNT(*) FROM job_listings WHERE isActive = 1;"
   ```

## Development Workflow

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database Studio: http://localhost:5555 (after running `npm run db:studio`)

3. **Add more jobs:**
   - Use the API endpoint: `POST /api/scraping/seed`
   - Or run: `npm run seed`
   - Or modify `src/scripts/seed-jobs.ts` and run it

## Database Schema

The main tables are:

- **job_listings:** Contains all job data
- **scraping_logs:** Tracks seeding/scraping operations
- **portals:** Configuration for job portals (optional)

## Customizing Sample Data

To add your own sample jobs, edit `src/scripts/seed-jobs.ts`:

```typescript
const sampleJobs = [
  {
    title: "Your Job Title",
    company: "Your Company",
    location: "Your Location",
    description: "Job description...",
    requirements: "Job requirements...",
    benefits: "Job benefits...",
    salaryMin: 20000,
    salaryMax: 30000,
    salaryCurrency: "HKD",
    sourcePortal: "Your Portal",
    jobCategory: "Your Category",
    employmentType: "Full-time",
    experienceLevel: "Mid-level",
    originalUrl: "https://example.com/job"
  },
  // Add more jobs...
];
```

Then run `npm run seed` to update the database.

## Troubleshooting

### Database Issues
```bash
# Reset database
rm prisma/dev.db
npm run db:push
npm run seed
```

### Permission Issues
```bash
# Make scripts executable (Linux/Mac)
chmod +x src/scripts/*.ts
```

### Missing Dependencies
```bash
# Reinstall dependencies
npm install
npm run db:generate
```

This approach bypasses the complex web scraping setup and gives you a working job finder application with realistic sample data.
