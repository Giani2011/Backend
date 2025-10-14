require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const db = require('./src/db');

const authRoutes = require('./src/routes/auth');

const app = express();
app.use(helmet());
app.use(express.json());

// CORS - set origin to your frontend during dev e.g. http://localhost:5500
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin || origin === 'null') return true; // non-browser, same-origin, or file://
  try {
    const url = new URL(origin);
    const host = url.hostname;

    // If allowlist is empty, allow all (dev-friendly)
    if (allowedOrigins.length === 0) return true;

    // Explicit full origin match
    if (allowedOrigins.includes(origin)) return true;

    // Wildcard patterns like "*.example.com" or ".example.com"
    for (const pattern of allowedOrigins) {
      if (pattern.startsWith('*.') || pattern.startsWith('.')) {
        const suffix = pattern.replace(/^\*?\./, '');
        if (host === suffix || host.endsWith('.' + suffix)) return true;
      }
    }

    // Allow Vercel previews by default unless disabled
    if ((process.env.ALLOW_VERCEL_PREVIEWS || 'true') === 'true') {
      if (host.endsWith('.vercel.app')) return true;
    }

    return false;
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true
}));

// global rate limiter (light)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120
}));

app.use('/api/auth', authRoutes);

app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date() }));

// Initialize database (create tables if they don't exist)
(async function init() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'create_users.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      console.log('Database initialized');
    }
  } catch (e) {
    console.error('Database init error', e);
  }
})();

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));

// aaa //