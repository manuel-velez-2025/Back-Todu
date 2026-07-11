import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=users,public',
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres (user-service):', err);
});