/**
 * Migration Script: Add is_auto_inject column to payment_history
 * 
 * This script:
 * 1. Adds the `is_auto_inject` boolean column (default false) to payment_history table
 * 2. Backfills existing auto-inject records by matching catatan LIKE '%auto-injeksi%'
 * 
 * Usage: node scripts/migrate-auto-inject.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/config/database.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('🔧 Step 1: Adding is_auto_inject column to payment_history...');
    
    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payment_history' AND column_name = 'is_auto_inject'
    `);

    if (checkColumn.length === 0) {
      await db.execute(sql`
        ALTER TABLE payment_history 
        ADD COLUMN is_auto_inject BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('  ✅ Column is_auto_inject added successfully');
    } else {
      console.log('  ℹ️  Column is_auto_inject already exists, skipping...');
    }

    console.log('\n🔄 Step 2: Backfilling existing auto-inject records...');
    
    // Count existing auto-inject records
    const countBefore = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM payment_history 
      WHERE LOWER(catatan) LIKE '%auto-injeksi%'
    `);
    console.log(`  📊 Found ${countBefore[0].count} existing auto-inject records`);

    // Update existing records
    const updateResult = await db.execute(sql`
      UPDATE payment_history 
      SET is_auto_inject = true 
      WHERE LOWER(catatan) LIKE '%auto-injeksi%' 
        AND is_auto_inject = false
      RETURNING id, assignment_id, jumlah_bayar, catatan
    `);

    console.log(`  ✅ Updated ${updateResult.length} records to is_auto_inject = true`);
    
    if (updateResult.length > 0) {
      console.log('\n  📋 Updated records:');
      updateResult.forEach((row, idx) => {
        const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah_bayar);
        console.log(`     ${idx + 1}. Payment ID: ${row.id} | Assignment: ${row.assignment_id} | Amount: ${amount}`);
      });
    }

    // Verify
    const countAfter = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM payment_history 
      WHERE is_auto_inject = true
    `);
    console.log(`\n  ✅ Verification: ${countAfter[0].count} records now marked as auto-inject`);

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
