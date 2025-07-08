# Database Setup Guide

## PostgreSQL Setup with Docker

This project uses PostgreSQL as the database. The easiest way to get started is using Docker Compose.

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- npm or yarn package manager

### Quick Start

1. **Start PostgreSQL with Docker Compose**
   ```bash
   docker-compose up -d
   ```
   This will start:
   - PostgreSQL 16 on port 5432
   - pgAdmin 4 on port 5050 (optional database GUI)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   The default `.env` file is pre-configured for local development.

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

### Database Connection

Default local connection string:
```
postgresql://jobfinder:jobfinder123@localhost:5432/hk_job_scraper
```

### Database Management

**View database with pgAdmin:**
- URL: http://localhost:5050
- Email: admin@jobfinder.com
- Password: admin123

**View database with Prisma Studio:**
```bash
npm run db:studio
```

### Common Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create a new migration
npm run db:migrate:create

# Apply migrations
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Reset database
npm run db:migrate:reset

# Seed database
npm run db:seed
```

### Production Setup

For production, update the `DATABASE_URL` in your environment:

```env
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

Consider using a managed PostgreSQL service like:
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- DigitalOcean Managed Databases
- Supabase
- Neon

### Troubleshooting

**Connection refused error:**
- Ensure Docker containers are running: `docker-compose ps`
- Check if PostgreSQL is ready: `docker-compose logs postgres`

**Permission denied error:**
- The init.sql script should handle permissions automatically
- If issues persist, connect as superuser and grant permissions manually

**Migration errors:**
- Ensure DATABASE_URL is correctly set
- Check if database exists
- Run `npm run db:migrate:reset` to start fresh (WARNING: This deletes all data)