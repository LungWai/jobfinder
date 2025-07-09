export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string;
  benefits?: string;
  applicationDeadline?: Date | string;
  originalUrl: string;
  sourcePortal: string;
  jobCategory?: string;
  employmentType?: string;
  experienceLevel?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastScrapedAt: Date | string;
  scrapedCount: number;
  contentHash: string;
}

export interface ScrapingResult {
  success: boolean;
  jobsScraped: number;
  jobsNew: number;
  jobsUpdated: number;
  errors: string[];
  portal: string;
  duration: number;
}

export interface ScrapingConfig {
  portal: string;
  baseUrl: string;
  selectors: {
    jobContainer: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    description: string;
    link: string;
    deadline?: string;
  };
  pagination?: {
    nextButton?: string;
    pageParam?: string;
    maxPages?: number;
  };
  requestDelay: number;
  maxRetries: number;
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