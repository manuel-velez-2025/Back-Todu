import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/db_geo',
  options: `-c search_path=${process.env.DB_SCHEMA || 'geo'},public`,
});
