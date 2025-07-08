import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import logger from '../utils/logger';
import jobRoutes from './routes/jobs';
import scrapingRoutes from './routes/scraping';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import interviewRoutes from './routes/interviews';
import documentRoutes from './routes/documents';
import reminderRoutes from './routes/reminders';
import profileRoutes from './routes/profile';
import { validateAuthConfig } from '../config/auth.config';

// Load environment variables
dotenv.config();

// Validate authentication configuration
validateAuthConfig();

const app = express();
const PORT = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/profile', profileRoutes);

// Serve static files from client build (for production)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  
  // Catch all handler for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
