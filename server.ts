/**
 * Futures Lab: Full-Stack Express Entry Point
 * Mounts Express API on /api and Vite middleware on port 3000
 */

import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
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

// In local or container mode, start the HTTP listener.
// When deployed as a Vercel Serverless Function, Vercel imports the app directly without listening.
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

export default app;
