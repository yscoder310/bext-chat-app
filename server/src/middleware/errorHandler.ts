import { Request, Response, NextFunction } from 'express';
import { logError, logWarn } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error with context
  const errorContext = {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
    userId: (req as any).user?.id || 'anonymous',
    ip: req.ip,
  };

  if (err.statusCode >= 500) {
    logError('Server error', err, errorContext);
  } else if (err.statusCode >= 400) {
    logWarn('Client error', errorContext);
  }

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      stack: err.stack,
      details: err,
    });
    return;
  }

  // Production error response
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  } else {
    logError('Unexpected error', err, errorContext);
    res.status(500).json({
      success: false,
      error: 'Something went wrong',
    });
  }
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};
