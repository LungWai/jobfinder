import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthTokenPayload } from '../types/auth';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      token?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    try {
      const payload = authService.verifyToken(token);
      req.user = payload;
      req.token = token;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = authService.verifyToken(token);
        req.user = payload;
        req.token = token;
      } catch (error) {
        // Token is invalid but we don't fail the request
        logger.warn('Invalid token in optional auth:', error);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Rate limiting middleware for auth endpoints
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const authRateLimit = (
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || record.resetTime < now) {
      // Create new record or reset expired one
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        error: 'Too many requests',
        retryAfter
      });
      return;
    }
    
    record.count++;
    next();
  };
};

/**
 * Clean up expired rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Session validation middleware
 */
export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No session found' });
      return;
    }

    // You can add additional session validation here
    // For example, check if user still exists, is not banned, etc.
    
    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
};

/**
 * Middleware to log authentication events
 */
export const logAuthEvent = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.userId || 'anonymous';
    const email = req.user?.email || 'unknown';
    
    logger.info(`Auth event: ${eventType}`, {
      userId,
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    next();
  };
};

/**
 * CORS middleware for auth endpoints
 */
export const authCors = (allowedOrigins: string[] = ['*']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  };
};