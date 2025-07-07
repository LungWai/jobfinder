#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { seedJobs } from './seed-jobs';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

async function setupDatabase() {
  try {
    logger.info('Setting up database...');

    // Step 1: Generate Prisma client
    logger.info('Generating Prisma client...');
    await execAsync('npx prisma generate');
    logger.info('Prisma client generated successfully');

    // Step 2: Push database schema
    logger.info('Pushing database schema...');
    await execAsync('npx prisma db push');
    logger.info('Database schema pushed successfully');

    // Step 3: Seed the database
    logger.info('Seeding database with sample data...');
    await seedJobs();
    logger.info('Database seeded successfully');

    logger.info('Database setup completed successfully!');
    logger.info('You can now start the application and view job listings');

  } catch (error) {
    logger.error('Error setting up database:', error);
    throw error;
  }
}

// Run the setup function
if (require.main === module) {
  setupDatabase()
    .then(() => {
      logger.info('Database setup process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database setup process failed:', error);
      process.exit(1);
    });
}

export { setupDatabase };
