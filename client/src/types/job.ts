export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  description: string;
  requirements?: string;
  benefits?: string;
  applicationDeadline?: string;
  originalUrl: string;
  sourcePortal: string;
  jobCategory?: string;
  employmentType?: string;
  experienceLevel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScrapedAt: string;
  scrapedCount: number;
  contentHash: string;
}

export interface JobFilters {
  search?: string;
  category?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  experienceLevel?: string;
  portal?: string;
  datePosted?: 'today' | 'week' | 'month' | 'all';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  portals: string[];
  categories: string[];
  locations: string[];
  employmentTypes: string[];
  experienceLevels: string[];
}

export interface ScrapingStats {
  totalJobs: number;
  jobsByPortal: Array<{
    sourcePortal: string;
    _count: { id: number };
  }>;
  lastUpdate?: string;
  recentLogs: Array<{
    id: string;
    portal: string;
    status: string;
    jobsScraped: number;
    createdAt: string;
  }>;
}
