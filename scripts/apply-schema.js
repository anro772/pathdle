/**
 * Applies supabase/schema.sql to the database in SUPABASE_DB_URL (.env).
 *
 * Usage:
 *   node scripts/apply-schema.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const SCHEMA_FILE = path.join(__dirname, '..', 'supabase', 'schema.sql');

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error('❌ SUPABASE_DB_URL is not set (env or .env)');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected');
  await client.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  console.log('✅ Schema applied');
  await client.end();
}

main().catch(err => {
  console.error('❌ Failed to apply schema:', err.message);
  process.exit(1);
});
