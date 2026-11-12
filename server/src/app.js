const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { ping } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  const origins = String(env.corsOrigin)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin/no-origin (curl, health checks) and configured origins.
        if (!origin || origins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: false,
    })
  );

  app.use(express.json({ limit: '2mb' }));

  // Health check: reports API + database status.
  app.get('/api/health', async (req, res) => {
    try {
      await ping();
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api', libraryRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
