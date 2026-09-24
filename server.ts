/**
 * Futures Lab: Full-Stack Express Entry Point
 * Mounts Express API on /api and Vite middleware on port 3000
 */

import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Futures Lab — Bitget Demo Bot',
      environment: 'EXCHANGE_DEMO',
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite in middleware mode for hot development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n================================================================`);
    console.log(`  Futures Lab — Bitget Demo Bot running at http://localhost:${PORT}`);
    console.log(`  Environment: EXCHANGE_DEMO (Live trading strictly prohibited)`);
    console.log(`================================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
