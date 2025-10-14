const { Pool } = require('pg');

const useSSL = process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production';

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined
    });
  }
  // Fallback to discrete PG vars (Render/Cloud providers sometimes expose these)
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGDATABASE) {
    return new Pool({
      host: PGHOST,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      port: PGPORT ? parseInt(PGPORT, 10) : undefined,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined
    });
  }
  console.error('[DB] Missing DATABASE_URL or PGHOST/PGUSER/PGDATABASE env vars');
  return new Pool({});
}

const pool = createPool();

async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] connection ok');
  } catch (e) {
    console.error('[DB] connection test failed:', e.message);
  }
}

testConnection();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
