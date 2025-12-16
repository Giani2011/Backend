import pkg from 'pg';
const { Pool } = pkg;

let pool;
const connectionString = process.env.DATABASE_URL;

// Add to the VERY TOP of server.js
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set',
  NODE_VERSION: process.version
});

if (connectionString) {
  console.log('✅ Database URL found. Creating pool...');
  pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
  });
} else {
  console.warn('⚠️ DATABASE_URL not set. Database functionality disabled.');
  // Create a dummy pool object that won't crash your app
  pool = {
    query: () => {
      console.error('❌ Attempted to use database, but DATABASE_URL is not configured.');
      return Promise.reject(new Error('Database not configured'));
    },
    connect: () => {
      console.error('❌ Attempted to connect to database, but DATABASE_URL is not configured.');
      return Promise.reject(new Error('Database not configured'));
    },
    end: () => Promise.resolve()
  };
}

export default pool;