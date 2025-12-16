import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './src/db.js';
import authRoutes from './src/routes/auth.js';

// ADD THESE LINES AT THE VERY TOP OF server.js
console.log('=== DEBUG START ===');
console.log('1. Node version:', process.version);
console.log('2. NODE_ENV:', process.env.NODE_ENV);
console.log('3. PORT:', process.env.PORT);
console.log('4. DATABASE_URL exists?:', process.env.DATABASE_URL ? 'YES' : 'NO');
console.log('5. Current directory:', process.cwd());
console.log('6. Files in directory:', require('fs').readdirSync('.').join(', '));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Update this in your server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://safe-shake-frontend.vercel.app/' // ← Add your actual Vercel URL here
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ database: 'Connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Add to your server.js or a routes file
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  res.status(200).send(healthcheck);
});