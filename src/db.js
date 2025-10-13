const { Pool } = require('pg');

const useSSL = process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
