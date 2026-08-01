import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Starting refund data migration...');

  try {
    // Cari semua transaksi refund (jumlah_bayar < 0)
    const refunds = await db.execute(sql`
      SELECT 
        ph.id AS payment_id,
        ph.assignment_id,
        ph.jumlah_bayar,
        pa.tipe_pembayaran
      FROM payment_history ph
      JOIN property_assignments pa ON pa.id = ph.assignment_id
      WHERE ph.jumlah_bayar < 0
    `);

    console.log(`Found ${refunds.length} refund records to process.`);

    for (const refund of refunds) {
      const refundAmount = Math.abs(Number(refund.jumlah_bayar));
      
      if (refund.tipe_pembayaran === 'kredit_kpr') {
        // Cari auto injeksi
        const autoInjectRows = await db.execute(sql`
          SELECT id FROM payment_history
          WHERE assignment_id = ${refund.assignment_id} AND (is_auto_inject = true OR catatan ILIKE '%auto-injeksi%')
          LIMIT 1
        `);

        if (autoInjectRows.length > 0) {
          await db.execute(sql`
            UPDATE payment_history 
            SET jumlah_bayar = jumlah_bayar + ${refundAmount}
            WHERE id = ${autoInjectRows[0].id}
          `);
          
          await db.execute(sql`
            UPDATE property_assignments
            SET dp = dp - ${refundAmount}, updated_at = NOW()
            WHERE id = ${refund.assignment_id}
          `);
          console.log(`Updated KPR Assignment ${refund.assignment_id}: Auto-Injeksi +${refundAmount}, DP -${refundAmount}`);
        } else {
          console.log(`Warning: No Auto-Injeksi found for KPR Assignment ${refund.assignment_id}`);
        }
      } else {
        // Cash
        await db.execute(sql`
          UPDATE property_assignments
          SET harga_total = harga_total - ${refundAmount}, updated_at = NOW()
          WHERE id = ${refund.assignment_id}
        `);
        console.log(`Updated Cash Assignment ${refund.assignment_id}: Harga Total -${refundAmount}`);
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
