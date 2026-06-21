import { Pool } from 'pg';
import { config } from './index';

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
  process.exit(-1);
});

export default pool;
