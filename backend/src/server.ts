import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { apiRouter } from './routes/api';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// API routes
app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler - must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404
    }
  });
});

// Global error handler - must be the last middleware
app.use((err: Error | ApiError, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Error processing ${req.method} ${req.path}:`, err);
  
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
export default app;
