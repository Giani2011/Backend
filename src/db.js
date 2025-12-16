import pkg from 'pg';
const { Pool } = pkg;

console.log('=== DB INIT START ===');

let pool;
try {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL is not set. Using dummy database.');
    pool = {
      query: () => Promise.reject(new Error('Database not configured')),
      connect: () => Promise.reject(new Error('Database not configured')),
      end: () => Promise.resolve()
    };
  } else {
    console.log('✅ DATABASE_URL found, creating pool...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection but DON'T crash if it fails
    pool.query('SELECT 1 as test').then(() => {
      console.log('✅ Database test query succeeded');
    }).catch(err => {
      console.warn('⚠️ Database test query failed (non-fatal):', err.message);
    });
  }
} catch (error) {
  console.error('❌ ERROR in db.js initialization:', error.message);
  // Create dummy pool even if Pool constructor fails
  pool = {
    query: () => Promise.reject(new Error('Database initialization failed')),
    connect: () => Promise.reject(new Error('Database initialization failed')),
    end: () => Promise.resolve()
  };
}

console.log('=== DB INIT COMPLETE ===');
export default pool;