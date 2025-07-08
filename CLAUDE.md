# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hong Kong Job Finder - A web application that scrapes job listings from multiple Hong Kong job portals and provides a unified interface for job searching and application tracking.

## Essential Commands

### Development
```bash
npm run dev                # Start both backend (port 3001) and frontend (port 5173)
npm run dev:server         # Backend only with hot reload
npm run dev:client         # Frontend only
```

### Database Management
```bash
npm run db:push           # Push schema to database (use for development)
npm run db:migrate        # Run migrations
npm run db:studio         # Open Prisma Studio GUI
npm run db:seed           # Seed with sample data
```

### Scraping
```bash
npm run scrape            # Run all scrapers
npm run scrape jobsdb     # Run specific scraper (jobsdb|recruit|goodjobs|university)
npm run test:scrapers     # Test scraper functionality
```

### Build & Production
```bash
npm run build             # Build both frontend and backend
npm start                 # Start production server (requires build)
```

### Testing & Linting
```bash
npm run lint              # Run ESLint (in client directory)
```

## Architecture Overview

### Backend Structure
- **Express Server**: `/src/server/index.ts` - Main API server with comprehensive middleware
- **Scrapers**: `/src/scrapers/` - Playwright-based scrapers for each job portal
  - Base scraper class with anti-detection measures
  - Individual implementations: JobsDB, Recruit.com.hk, CT Good Jobs, University boards
- **Database**: Prisma ORM with PostgreSQL (SQLite in development)
  - Schema: `/prisma/schema.prisma`
  - Services: `/src/database/` - Job service, application service, etc.
- **Authentication**: JWT-based auth in `/src/auth/`
  - Access tokens (15min) and refresh tokens (7 days)
  - Email verification and password reset flows

### Frontend Structure
- **React + TypeScript**: `/client/src/`
- **Routing**: React Router v7 with pages in `/client/src/pages/`
- **API Client**: `/client/src/services/` - Axios-based API services
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS with responsive design

### Key API Routes
- `/api/jobs` - Job listings with pagination and filtering
- `/api/auth` - Authentication endpoints
- `/api/scraping` - Trigger and monitor scraping operations
- `/api/applications` - Job application tracking (in progress)

### Database Models
Primary models include:
- `JobListing` - Jobs with content-based deduplication
- `User` & `UserProfile` - User management
- `JobApplication` - Application tracking with status history
- `Company`, `Location`, `Category` - Job categorization
- `ScrapingLog` - Scraping operation tracking

### Security Considerations
- Rate limiting on all API endpoints
- Helmet.js for security headers
- CORS configuration for production
- Input validation throughout
- Bcrypt password hashing
- JWT authentication with refresh tokens

### Scraping Architecture
- Respectful scraping with delays between requests
- Content hashing for deduplication
- Automatic retry with exponential backoff
- Comprehensive error logging
- Portal-specific selectors maintained in each scraper

## Development Workflow

1. **Database Changes**: Modify `/prisma/schema.prisma`, then run `npm run db:push` (dev) or create migrations (prod)
2. **Adding Scrapers**: Extend `BaseScraper` class, implement required methods, register in scraper manager
3. **API Endpoints**: Add routes in `/src/server/routes/`, implement business logic in services
4. **Frontend Features**: Create components in `/client/src/components/`, pages in `/client/src/pages/`

## Environment Setup

Critical environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` & `REFRESH_TOKEN_SECRET` - Authentication secrets
- `SMTP_*` - Email configuration for notifications
- `NODE_ENV` - Set to "production" for production builds

## Important Notes

- Always check existing patterns before implementing new features
- Scrapers must respect robots.txt and implement appropriate delays
- Use Prisma client for all database operations
- Frontend API calls should go through the service layer
- Logs are written to `/logs/` directory (combined.log and error.log)