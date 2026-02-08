#!/usr/bin/env node

/**
 * Check Database Schema
 * 
 * Checks if all required columns and tables exist in the database.
 * 
 * Usage:
 *   node scripts/check-schema.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  return !error;
}

async function checkColumn(tableName, columnName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .limit(1);
  
  return !error;
}

async function main() {
  console.log('🔍 Checking database schema...');
  console.log('─'.repeat(60));
  
  const checks = {
    tables: {
      'users': await checkTable('users'),
      'workflows': await checkTable('workflows'),
      'purchases': await checkTable('purchases'),
      'flowglad_webhook_events': await checkTable('flowglad_webhook_events'),
    },
    workflowColumns: {
      'is_published': await checkColumn('workflows', 'is_published'),
      'price_in_cents': await checkColumn('workflows', 'price_in_cents'),
      'flowglad_product_id': await checkColumn('workflows', 'flowglad_product_id'),
      'flowglad_price_id': await checkColumn('workflows', 'flowglad_price_id'),
    },
  };
  
  console.log('\n📊 Tables:');
  for (const [name, exists] of Object.entries(checks.tables)) {
    console.log(`  ${exists ? '✅' : '❌'} ${name}`);
  }
  
  console.log('\n📊 Workflow Commerce Columns:');
  for (const [name, exists] of Object.entries(checks.workflowColumns)) {
    console.log(`  ${exists ? '✅' : '❌'} ${name}`);
  }
  
  const allTablesExist = Object.values(checks.tables).every(v => v);
  const allColumnsExist = Object.values(checks.workflowColumns).every(v => v);
  
  console.log('\n' + '─'.repeat(60));
  if (allTablesExist && allColumnsExist) {
    console.log('✅ Schema is complete! All migrations have been applied.');
  } else {
    console.log('⚠️  Schema is incomplete. Some migrations need to be run.');
    console.log('\n📝 To fix:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Run: backend/db/APPLY_ALL_MIGRATIONS.sql');
    console.log('3. Or see: backend/db/FIX_SCHEMA.md');
  }
  console.log('─'.repeat(60));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
