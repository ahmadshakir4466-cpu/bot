/**
 * Futures Lab: Full-Stack Express App Configuration
 * Shared between local development (server.ts) and Vercel Serverless Functions (/api/index.ts).
 */

import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from './routes.ts';

export const app = express();

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS & Header Configuration
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Health check endpoints for monitoring & uptime pingers
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Futures Lab — Bitget Demo Bot',
    environment: 'EXCHANGE_DEMO',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount API router
// Mounted on /api for standard requests and / for rewritten paths
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Catch-all for unknown /api/* routes: Always return JSON 404, NEVER HTML!
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    code: 'NOT_FOUND',
    status: 404,
  });
});

// Global API error handler: Guarantees valid JSON response
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Unhandled API error on ${req.method} ${req.url}:`, err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
  });
});

export default app;
