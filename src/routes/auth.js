const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const db = require('../db');
const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'change_this';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'change_this_too';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

function signAccessToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}
function signRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/* Register */
router.post('/signup',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const existing = await db.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
      if (existing.rows.length) return res.status(409).json({ error: 'User already exists' });

      const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const result = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, is_verified',
        [email, password_hash]
      );
      const user = result.rows[0];

      const accessToken = signAccessToken(user);
      const rawRefresh = signRefreshToken();
      const refreshHash = hashToken(rawRefresh);
      const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 3600 * 1000);

      await db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, refreshHash, expires_at]);

      res.json({ user: { id: user.id, email: user.email }, accessToken, refreshToken: rawRefresh });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

/* Login */
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const q = await db.query('SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)', [email]);
      const user = q.rows[0];
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

      const accessToken = signAccessToken(user);
      const rawRefresh = signRefreshToken();
      const refreshHash = hashToken(rawRefresh);
      const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 3600 * 1000);

      await db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, refreshHash, expires_at]);

      res.json({ user: { id: user.id, email: user.email }, accessToken, refreshToken: rawRefresh });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

/* Refresh token */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

    const refreshHash = hashToken(refreshToken);
    const r = await db.query('SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
    const row = r.rows[0];
    if (!row) return res.status(403).json({ error: 'Invalid refresh token' });
    if (new Date(row.expires_at) < new Date()) {
      await db.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      return res.status(403).json({ error: 'Refresh token expired' });
    }
    const u = await db.query('SELECT id, email FROM users WHERE id = $1', [row.user_id]);
    const user = u.rows[0];
    if (!user) return res.status(403).json({ error: 'Invalid user' });

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Logout (revoke refresh token) */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

    const refreshHash = hashToken(refreshToken);
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Protected route example */
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing token' });
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const u = await db.query('SELECT id, email, is_verified, created_at FROM users WHERE id = $1', [payload.userId]);
    if (!u.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: u.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

