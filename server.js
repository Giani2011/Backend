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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null') return callback(null, true); // non-browser, same-origin, or file://
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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
    let sql = '';
    if (fs.existsSync(sqlPath)) {
      sql = fs.readFileSync(sqlPath, 'utf8');
    } else {
      console.warn('[DB] migrations/create_users.sql not found. Using inline fallback.');
      sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));
`;
    }
    if (sql && sql.trim()) {
      await db.query(sql);
      console.log('[DB] Database initialized');
    } else {
      console.warn('[DB] No migration SQL to run');
    }
  } catch (e) {
    console.error('Database init error', e);
  }
})();

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));

// aaa /