import morgan from 'morgan';
import { morganStream } from '../config/logger';

/**
 * Custom Morgan token to log user ID from request
 */
morgan.token('user-id', (req: any) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Custom Morgan token to log request body (sanitized)
 */
morgan.token('body', (req: any) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return '-';
  }
  
  // Sanitize sensitive fields
  const sanitized = { ...req.body };
  const sensitiveFields = ['password', 'token', 'secret', 'accessToken', 'refreshToken'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });
  
  return JSON.stringify(sanitized);
});

/**
 * Development format - detailed and colorful
 */
export const morganDevFormat = morgan(
  ':method :url :status :response-time ms - :res[content-length] - User: :user-id',
  { stream: morganStream }
);

/**
 * Production format - structured JSON
 */
export const morganProdFormat = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  { stream: morganStream }
);

/**
 * Detailed format with request body (for debugging)
 */
export const morganDetailedFormat = morgan(
  (tokens: any, req: any, res: any) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens['response-time'](req, res), 'ms',
      '- User:', tokens['user-id'](req, res),
      '- Body:', tokens.body(req, res)
    ].join(' ');
  },
  { 
    stream: morganStream,
    skip: (req) => {
      // Skip logging for health check and static files
      return req.url?.includes('/health') || req.url?.includes('/static');
    }
  }
);

/**
 * Get appropriate Morgan middleware based on environment
 */
export const getMorganMiddleware = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return morganProdFormat;
  } else if (env === 'test') {
    // Don't log in test environment
    return morgan('combined', { 
      skip: () => true 
    });
  } else {
    return morganDevFormat;
  }
};
