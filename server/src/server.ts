import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { initializeSocket } from './config/socket';
import { getMorganMiddleware } from './middleware/requestLogger';
import { logInfo, logError } from './config/logger';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(getMorganMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes if needed
app.set('io', io);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    httpServer.listen(PORT, () => {
      logInfo('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
    });
  } catch (error) {
    logError('Failed to start server', error instanceof Error ? error : new Error('Unknown error'));
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logInfo('HTTP server closed');
  });
});

export default app;
