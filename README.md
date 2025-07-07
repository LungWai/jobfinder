# Hong Kong Job Scraper

A comprehensive web application that scrapes job listings from multiple Hong Kong job portals and displays them in a unified, searchable interface.

## Features

- **Multi-Portal Scraping**: Scrapes jobs from JobsDB, CT Good Jobs, Recruit.com.hk, and University job portals
- **Unified Interface**: Clean, responsive React frontend with advanced filtering and search
- **Real-time Data**: Regular updates with deduplication and data normalization
- **Dashboard**: Monitor scraping operations and view statistics
- **RESTful API**: Well-documented API for job data access
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database with Prisma ORM
- **Playwright** for web scraping
- **Winston** for logging
- **node-cron** for scheduled jobs

### Frontend
- **React** with TypeScript and Vite
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **Heroicons** for icons

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hk-job-scraper
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb hk_job_scraper
   
   # Or using psql
   psql -c "CREATE DATABASE hk_job_scraper;"
   ```

5. **Configure environment variables**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp client/.env.example client/.env
   
   # Edit .env with your database credentials
   DATABASE_URL="postgresql://username:password@localhost:5432/hk_job_scraper"
   ```

6. **Set up database schema**
   ```bash
   npm run db:push
   ```

7. **Install Playwright browsers**
   ```bash
   npx playwright install
   ```

## Development

### Start the development servers

1. **Start backend server**
   ```bash
   npm run dev:server
   ```

2. **Start frontend development server** (in another terminal)
   ```bash
   npm run dev:client
   ```

3. **Or start both simultaneously**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/health

### Manual Scraping

Run scrapers manually for testing:

```bash
# Run all scrapers
npm run scrape

# Run specific scraper
npm run scrape jobsdb
npm run scrape goodjobs
npm run scrape recruit
npm run scrape university
```

## API Endpoints

### Jobs
- `GET /api/jobs` - Get jobs with filtering and pagination
- `GET /api/jobs/:id` - Get specific job details
- `GET /api/jobs/stats/overview` - Get job statistics
- `GET /api/jobs/filters/options` - Get available filter options

### Scraping
- `POST /api/scraping/trigger` - Manually trigger scraping
- `GET /api/scraping/status` - Get scraping status
- `POST /api/scraping/cleanup` - Clean up old jobs

## Database Schema

### JobListing
- Job details (title, company, location, salary, description)
- Metadata (source portal, creation date, last scraped)
- Deduplication hash for preventing duplicates

### ScrapingLog
- Scraping operation logs and statistics
- Error tracking and performance monitoring

### Portal
- Portal configuration and status
- Scraping settings and last update times

## Deployment

### Production Build

```bash
# Build backend
npm run build:server

# Build frontend
npm run build:client

# Start production server
npm start
```

### Environment Variables (Production)

```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
PORT=3001
CORS_ORIGIN=https://yourdomain.com
```

### Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

## Monitoring

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output in development

### Database
- Use Prisma Studio: `npm run db:studio`
- Monitor scraping logs in the dashboard
- Check job statistics and portal status

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists

2. **Scraping Failures**
   - Check internet connection
   - Verify target websites are accessible
   - Review robots.txt compliance
   - Check browser installation: `npx playwright install`

3. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version (18+)
   - Verify all dependencies are installed

### Performance Optimization

1. **Database**
   - Ensure proper indexing on frequently queried fields
   - Regular cleanup of old job listings
   - Monitor query performance

2. **Scraping**
   - Adjust request delays based on website response
   - Implement proper error handling and retries
   - Use concurrency limits to avoid overwhelming servers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Legal Considerations

- Respect robots.txt files
- Implement appropriate delays between requests
- Monitor for rate limiting
- Ensure compliance with website terms of service
- Consider data privacy regulations

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue with detailed information
4. Include error messages and steps to reproduce
