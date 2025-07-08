# Database Migration Strategy

This document outlines the migration strategy from the current simple schema to the enhanced schema with proper relationships and advanced features.

## Overview

The enhanced schema introduces significant improvements:
- Normalized company data with dedicated Company table
- Hierarchical location system
- Many-to-many relationships for skills, languages, categories, and industries
- User management and application tracking
- Analytics and statistics tables
- Better field organization and enums

## Migration Phases

### Phase 1: Core Structure Migration
**Priority: High**
**Dependencies: None**

1. **Create new tables without foreign keys:**
   - Company
   - Location
   - Category
   - Industry
   - Language
   - Skill
   - User

2. **Populate reference data:**
   - Import location hierarchy (Country → Region → District → Area)
   - Import common skills, languages, and industries
   - Create category taxonomy

### Phase 2: Data Normalization
**Priority: High**
**Dependencies: Phase 1**

1. **Extract and normalize company data:**
   ```sql
   -- Extract unique companies from JobListing
   INSERT INTO companies (name, created_at, updated_at)
   SELECT DISTINCT company, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
   FROM job_listings;
   ```

2. **Map locations:**
   - Parse location strings from JobListing
   - Match to hierarchical location structure
   - Create location entries for unmatched locations

### Phase 3: Enhanced JobListing Migration
**Priority: High**
**Dependencies: Phase 2**

1. **Add new columns to JobListing:**
   - companyId (foreign key to Company)
   - locationId (foreign key to Location)
   - remoteType, educationLevel, salaryPeriod, etc.

2. **Migrate existing data:**
   ```sql
   -- Update companyId based on company name
   UPDATE job_listings jl
   SET company_id = (SELECT id FROM companies WHERE name = jl.company);
   
   -- Update locationId based on location parsing
   -- This will require custom logic to parse and match locations
   ```

3. **Parse and split existing fields:**
   - Split requirements into qualifications and preferredSkills
   - Extract language requirements from description/requirements
   - Identify and tag skills mentioned in job descriptions

### Phase 4: Relationship Tables
**Priority: Medium**
**Dependencies: Phase 3**

1. **Create junction tables:**
   - JobSkill
   - JobLanguage
   - JobCategory
   - JobIndustry
   - CompanyLocation

2. **Populate relationships:**
   - Use NLP or keyword matching to extract skills from descriptions
   - Categorize jobs based on title and description
   - Link jobs to industries based on company information

### Phase 5: Application Tracking System
**Priority: Medium**
**Dependencies: Phase 4**

1. **Create ATS tables:**
   - Application
   - SavedJob
   - SavedSearch
   - JobAlert

2. **Initialize user system:**
   - Set up authentication
   - Create initial admin users

### Phase 6: Analytics and Statistics
**Priority: Low**
**Dependencies: Phase 3**

1. **Create analytics tables:**
   - SalaryStatistic
   - JobMarketTrend

2. **Calculate initial statistics:**
   - Generate salary statistics by category/location
   - Calculate job market trends

### Phase 7: Portal Enhancement
**Priority: Low**
**Dependencies: None**

1. **Enhance Portal model:**
   - Add new configuration fields
   - Migrate existing portal data

2. **Update ScrapingLog:**
   - Add portalId foreign key
   - Add new metric fields

## Migration Scripts

### 1. Data Extraction Script (Node.js/TypeScript)
```typescript
// scripts/migrate-companies.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCompanies() {
  // Get unique companies
  const companies = await prisma.$queryRaw`
    SELECT DISTINCT company FROM job_listings
  `;
  
  // Create company records
  for (const { company } of companies) {
    await prisma.company.create({
      data: {
        name: company,
        displayName: company,
      }
    });
  }
}
```

### 2. Location Parser Script
```typescript
// scripts/parse-locations.ts
const locationPatterns = {
  hongKong: {
    regions: ['Hong Kong Island', 'Kowloon', 'New Territories'],
    districts: {
      'Hong Kong Island': ['Central', 'Wan Chai', 'Causeway Bay', ...],
      'Kowloon': ['Tsim Sha Tsui', 'Mong Kok', 'Yau Ma Tei', ...],
      'New Territories': ['Sha Tin', 'Tsuen Wan', 'Tuen Mun', ...]
    }
  }
};

function parseLocation(locationString: string) {
  // Logic to parse location string and match to hierarchy
}
```

### 3. Skill Extraction Script
```typescript
// scripts/extract-skills.ts
const commonSkills = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js',
  'SQL', 'AWS', 'Docker', 'Kubernetes', ...
];

function extractSkills(description: string, requirements: string) {
  const text = `${description} ${requirements}`.toLowerCase();
  return commonSkills.filter(skill => 
    text.includes(skill.toLowerCase())
  );
}
```

## Rollback Strategy

1. **Keep original columns** during migration (don't drop company, location strings)
2. **Create backup** before each phase
3. **Use transactions** for data migrations
4. **Version migrations** with MigrationLog table

## Testing Strategy

1. **Unit tests** for parsing functions
2. **Integration tests** for data migration scripts
3. **Data validation** after each phase:
   - Check for orphaned records
   - Verify data integrity
   - Compare counts before/after

## Performance Considerations

1. **Batch operations** for large data migrations
2. **Add indexes** after data migration
3. **Use raw SQL** for bulk updates
4. **Run migrations during off-peak hours**

## Timeline Estimate

- Phase 1-2: 1-2 days (core structure)
- Phase 3: 2-3 days (JobListing migration)
- Phase 4: 2-3 days (relationships)
- Phase 5: 3-4 days (ATS implementation)
- Phase 6-7: 2-3 days (analytics & portal)

Total: 10-15 days for complete migration

## Risks and Mitigation

1. **Data loss risk**
   - Mitigation: Keep backups, use transactions, maintain original fields

2. **Parsing accuracy**
   - Mitigation: Manual review for ambiguous cases, fallback options

3. **Performance impact**
   - Mitigation: Run in batches, use background jobs

4. **Schema conflicts**
   - Mitigation: Use Prisma migrations, test in staging first