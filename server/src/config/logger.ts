import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Define transports
const transports = [
  // Console transport for all logs
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Error logs - rotated daily
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    format: format,
  }),

  // Combined logs - rotated daily
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: format,
  }),

  // HTTP logs - rotated daily
  new DailyRotateFile({
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '7d', // Keep HTTP logs for 7 days
    format: format,
  }),

  // Debug logs (only in development)
  ...(process.env.NODE_ENV === 'development'
    ? [
        new DailyRotateFile({
          filename: path.join(logsDir, 'debug-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'debug',
          maxSize: '20m',
          maxFiles: '3d', // Keep debug logs for 3 days
          format: format,
        }),
      ]
    : []),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: any) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    });
  } else {
    logger.error(message, { error, ...meta });
  }
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  logger.http(message, meta);
};

// Socket event logging helpers
export const logSocketConnection = (userId: string, socketId: string) => {
  logger.info('Socket connected', {
    type: 'socket',
    event: 'connection',
    userId,
    socketId,
    timestamp: new Date().toISOString(),
  });
};

export const logSocketDisconnection = (userId: string, socketId: string, reason?: string) => {
  logger.info('Socket disconnected', {
    type: 'socket',
    event: 'disconnection',
    userId,
    socketId,
    reason,
    timestamp: new Date().toISOString(),
  });
};

export const logSocketEvent = (event: string, userId: string, data?: any) => {
  logger.debug('Socket event', {
    type: 'socket',
    event,
    userId,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const logSocketError = (event: string, userId: string, error: Error | any) => {
  logger.error('Socket error', {
    type: 'socket',
    event,
    userId,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
    timestamp: new Date().toISOString(),
  });
};

// Database operation logging helpers
export const logDbQuery = (operation: string, collection: string, query?: any) => {
  logger.debug('Database query', {
    type: 'database',
    operation,
    collection,
    query,
    timestamp: new Date().toISOString(),
  });
};

export const logDbError = (operation: string, collection: string, error: Error) => {
  logger.error('Database error', {
    type: 'database',
    operation,
    collection,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    timestamp: new Date().toISOString(),
  });
};

// Authentication logging helpers
export const logAuthSuccess = (userId: string, method: string, ip?: string) => {
  logger.info('Authentication success', {
    type: 'auth',
    event: 'success',
    userId,
    method,
    ip,
    timestamp: new Date().toISOString(),
  });
};

export const logAuthFailure = (username: string, method: string, reason: string, ip?: string) => {
  logger.warn('Authentication failure', {
    type: 'auth',
    event: 'failure',
    username,
    method,
    reason,
    ip,
    timestamp: new Date().toISOString(),
  });
};

// API request logging helpers
export const logApiRequest = (method: string, url: string, userId?: string, statusCode?: number, responseTime?: number) => {
  logger.http('API request', {
    type: 'api',
    method,
    url,
    userId,
    statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    timestamp: new Date().toISOString(),
  });
};

export const logApiError = (method: string, url: string, error: Error, statusCode: number) => {
  logger.error('API error', {
    type: 'api',
    method,
    url,
    statusCode,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    timestamp: new Date().toISOString(),
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, details?: any) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, 'Performance metric', {
    type: 'performance',
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Business logic logging
export const logBusinessEvent = (event: string, details: any) => {
  logger.info('Business event', {
    type: 'business',
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
