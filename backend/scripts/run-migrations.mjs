#!/usr/bin/env node

/**
 * Migration Runner for Supabase
 * 
 * This script applies database migrations in order.
 * 
 * Usage:
 *   node scripts/run-migrations.mjs
 * 
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *   - Install dependencies: npm install
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const migrationsDir = path.join(__dirname, '../db/migrations');

async function runMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📝 Running migration: ${filename}`);
  console.log('─'.repeat(60));
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error);
      return false;
    }
    
    console.log(`✅ Migration succeeded: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error('Error:', err.message);
    return false;
  }
}

async function runMigrationDirect(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📝 Running migration: ${filename}`);
  console.log('─'.repeat(60));
  
  try {
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
      if (error) {
        console.error(`❌ Statement failed:`, statement.substring(0, 100) + '...');
        console.error('Error:', error);
        return false;
      }
    }
    
    console.log(`✅ Migration succeeded: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error('Error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...');
  console.log('─'.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('─'.repeat(60));

  const migrationFiles = [
    '001_create_users_table.sql',
    '002_create_workflows_table.sql',
    '003_add_workflow_commerce_and_webhook_idempotency.sql',
  ];

  console.log('\n⚠️  Note: If migrations fail, you can run them manually through Supabase SQL Editor.');
  console.log('Each migration file is in: backend/db/migrations/\n');

  let allSucceeded = true;

  for (const file of migrationFiles) {
    const success = await runMigrationDirect(file);
    if (!success) {
      allSucceeded = false;
      console.log('\n⚠️  Migration failed. You can run this manually in Supabase SQL Editor.');
      console.log(`File: backend/db/migrations/${file}`);
      break;
    }
  }

  console.log('\n' + '─'.repeat(60));
  if (allSucceeded) {
    console.log('✅ All migrations completed successfully!');
  } else {
    console.log('❌ Some migrations failed. Please run them manually through Supabase SQL Editor.');
    console.log('\nManual steps:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste each migration file content');
    console.log('4. Execute in order: 001, 002, 003');
  }
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
