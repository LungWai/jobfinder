import { PasswordValidationResult, EmailValidationResult } from '../types/auth';
import { authConfig } from '../config/auth.config';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email with detailed result
 */
export function validateEmailDetailed(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      message: 'Email is required'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length === 0) {
    return {
      isValid: false,
      message: 'Email cannot be empty'
    };
  }

  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      message: 'Email is too long'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }

  // Additional validation
  const [localPart, domain] = trimmedEmail.split('@');

  if (localPart.length > 64) {
    return {
      isValid: false,
      message: 'Email local part is too long'
    };
  }

  // Check for consecutive dots
  if (/\.\./.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Email cannot contain consecutive dots'
    };
  }

  // Check for valid domain
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return {
      isValid: false,
      message: 'Invalid email domain'
    };
  }

  return {
    isValid: true,
    normalized: trimmedEmail
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }

  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check minimum length
  if (password.length < authConfig.passwordMinLength) {
    errors.push(`Password must be at least ${authConfig.passwordMinLength} characters long`);
    suggestions.push(`Add ${authConfig.passwordMinLength - password.length} more characters`);
  }

  // Check for uppercase letters
  if (authConfig.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  }

  // Check for lowercase letters
  if (authConfig.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add a lowercase letter (a-z)');
  }

  // Check for numbers
  if (authConfig.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  }

  // Check for special characters
  if (authConfig.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*(),.?":{}|<>)');
  }

  // Check for common passwords
  const commonPasswords = ['password', '123456', 'password123', 'admin', 'letmein', 'welcome', 'monkey', '1234567890'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
    suggestions.push('Choose a more unique password');
  }

  // Calculate password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let strengthScore = 0;

  if (password.length >= 8) strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strengthScore++;
  if (/\d/.test(password)) strengthScore++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthScore++;
  if (!/(.)\1{2,}/.test(password)) strengthScore++; // No repeated characters

  if (strengthScore >= 5) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors.join('. '),
      strength,
      suggestions
    };
  }

  return {
    isValid: true,
    strength,
    message: 'Password is valid'
  };
}

/**
 * Validate username
 */
export function validateUsername(username: string): { isValid: boolean; message?: string } {
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      message: 'Username is required'
    };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: 'Username must be at least 3 characters long'
    };
  }

  if (trimmed.length > 30) {
    return {
      isValid: false,
      message: 'Username must be no more than 30 characters long'
    };
  }

  // Allow letters, numbers, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Username can only contain letters, numbers, underscores, and hyphens'
    };
  }

  // Check for reserved usernames
  const reserved = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'ftp'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      message: 'This username is reserved'
    };
  }

  return { isValid: true };
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; message?: string; formatted?: string } {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      message: 'Phone number is required'
    };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      message: 'Phone number must be at least 10 digits'
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      message: 'Phone number is too long'
    };
  }

  // Format as international number (simple formatting)
  let formatted = digitsOnly;
  if (digitsOnly.length === 10) {
    // US format: (xxx) xxx-xxxx
    formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    // US format with country code: +1 (xxx) xxx-xxxx
    formatted = `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }

  return {
    isValid: true,
    formatted
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): { isValid: boolean; message?: string } {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      message: 'URL is required'
    };
  }

  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        message: 'URL must use HTTP or HTTPS protocol'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid URL format'
    };
  }
}

/**
 * Validate date
 */
export function validateDate(date: string | Date): { isValid: boolean; message?: string; date?: Date } {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return {
      isValid: false,
      message: 'Invalid date format'
    };
  }

  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      message: 'Invalid date'
    };
  }

  return {
    isValid: true,
    date: dateObj
  };
}

/**
 * Validate age
 */
export function validateAge(birthDate: string | Date, minAge: number = 18): { isValid: boolean; message?: string; age?: number } {
  const dateValidation = validateDate(birthDate);
  
  if (!dateValidation.isValid || !dateValidation.date) {
    return {
      isValid: false,
      message: 'Invalid birth date'
    };
  }

  const today = new Date();
  const birth = dateValidation.date;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < minAge) {
    return {
      isValid: false,
      message: `Must be at least ${minAge} years old`,
      age
    };
  }

  if (age > 150) {
    return {
      isValid: false,
      message: 'Invalid age',
      age
    };
  }

  return {
    isValid: true,
    age
  };
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"'); // Escape double quotes
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: { size: number; type: string; name: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { isValid: boolean; message?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      message: 'File type not allowed'
    };
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      message: 'File extension not allowed'
    };
  }

  return { isValid: true };
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function validateCreditCard(cardNumber: string): { isValid: boolean; message?: string; type?: string } {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return {
      isValid: false,
      message: 'Card number is required'
    };
  }

  // Remove spaces and hyphens
  const cleaned = cardNumber.replace(/[\s-]/g, '');

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Card number must contain only digits'
    };
  }

  if (cleaned.length < 13 || cleaned.length > 19) {
    return {
      isValid: false,
      message: 'Invalid card number length'
    };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return {
      isValid: false,
      message: 'Invalid card number'
    };
  }

  // Detect card type
  let type = 'Unknown';
  if (/^4/.test(cleaned)) {
    type = 'Visa';
  } else if (/^5[1-5]/.test(cleaned)) {
    type = 'Mastercard';
  } else if (/^3[47]/.test(cleaned)) {
    type = 'American Express';
  } else if (/^6(?:011|5)/.test(cleaned)) {
    type = 'Discover';
  }

  return {
    isValid: true,
    type
  };
}