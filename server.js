require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');

const app = express();
app.use(helmet());
app.use(express.json());

// CORS - set origin to your frontend during dev e.g. http://localhost:5500
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// global rate limiter (light)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120
}));

app.use('/api/auth', authRoutes);

app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date() }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));
app.use(cors());
