import crypto from 'crypto';
import { JobListing } from '../types/job';

/**
 * Generate a content hash for job deduplication
 * Uses title, company, and description to create a unique identifier
 */
export function generateJobHash(job: Partial<JobListing>): string {
  const content = [
    job.title?.toLowerCase().trim(),
    job.company?.toLowerCase().trim(),
    job.location?.toLowerCase().trim(),
    // Use first 500 chars of description to avoid minor formatting differences
    job.description?.toLowerCase().trim().substring(0, 500)
  ].filter(Boolean).join('|');
  
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Normalize salary string to extract min/max values
 */
export function parseSalary(salaryText: string): { min?: number; max?: number; currency: string } {
  if (!salaryText) return { currency: 'HKD' };
  
  // Remove common prefixes and clean up
  const cleaned = salaryText
    .replace(/HK\$|HKD|\$|,/g, '')
    .replace(/per month|\/month|monthly|p\.m\./gi, '')
    .replace(/per annum|\/annum|annually|p\.a\./gi, '')
    .trim();
  
  // Look for range patterns like "20000-30000" or "20K-30K"
  const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-–—]\s*(\d+(?:\.\d+)?)\s*[kK]?/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]) * (rangeMatch[1].toLowerCase().includes('k') ? 1000 : 1);
    const max = parseFloat(rangeMatch[2]) * (rangeMatch[2].toLowerCase().includes('k') ? 1000 : 1);
    return { min, max, currency: 'HKD' };
  }
  
  // Look for single value with K suffix
  const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]) * 1000;
    return { min: value, max: value, currency: 'HKD' };
  }
  
  // Look for plain number
  const numberMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const value = parseFloat(numberMatch[1]);
    return { min: value, max: value, currency: 'HKD' };
  }
  
  return { currency: 'HKD' };
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n')  // Remove empty lines
    .trim();
}
