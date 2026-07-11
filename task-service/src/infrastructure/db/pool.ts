import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=tasks,public',
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres (task-service):', err);
});
