-- Initial PostgreSQL setup for HK Job Scraper

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Set default encoding
SET client_encoding = 'UTF8';

-- Grant permissions (adjust as needed for production)
GRANT ALL PRIVILEGES ON DATABASE hk_job_scraper TO jobfinder;

-- Create schema if needed (optional, for better organization)
-- CREATE SCHEMA IF NOT EXISTS jobfinder AUTHORIZATION jobfinder;
-- SET search_path TO jobfinder, public;