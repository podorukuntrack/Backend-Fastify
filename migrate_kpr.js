import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  console.log('Starting KPR Migration & Trigger Installation...');

  try {
    // 1. Install PostgreSQL Trigger
    console.log('Installing triggers for total_dibayar synchronization...');
    
    // Create Trigger Function
    await sql`
      CREATE OR REPLACE FUNCTION update_total_dibayar()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE property_assignments
          SET total_dibayar = (
            SELECT COALESCE(SUM(jumlah_bayar), 0)
            FROM payment_history
            WHERE assignment_id = NEW.assignment_id
          )
          WHERE id = NEW.assignment_id;
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          -- Update for the assignment being updated
          UPDATE property_assignments
          SET total_dibayar = (
            SELECT COALESCE(SUM(jumlah_bayar), 0)
            FROM payment_history
            WHERE assignment_id = NEW.assignment_id
          )
          WHERE id = NEW.assignment_id;
          
          -- If assignment_id changed, update the old one too
          IF OLD.assignment_id != NEW.assignment_id THEN
            UPDATE property_assignments
            SET total_dibayar = (
              SELECT COALESCE(SUM(jumlah_bayar), 0)
              FROM payment_history
              WHERE assignment_id = OLD.assignment_id
            )
            WHERE id = OLD.assignment_id;
          END IF;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE property_assignments
          SET total_dibayar = (
            SELECT COALESCE(SUM(jumlah_bayar), 0)
            FROM payment_history
            WHERE assignment_id = OLD.assignment_id
          )
          WHERE id = OLD.assignment_id;
          RETURN OLD;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Drop if exists and create trigger
    await sql`DROP TRIGGER IF EXISTS trigger_update_total_dibayar ON payment_history;`;
    await sql`
      CREATE TRIGGER trigger_update_total_dibayar
      AFTER INSERT OR UPDATE OR DELETE ON payment_history
      FOR EACH ROW
      EXECUTE FUNCTION update_total_dibayar();
    `;
    console.log('Trigger installed successfully!');

    // 2. Data Sync for existing KPR
    console.log('Syncing existing KPR assignments...');
    const kprAssignments = await sql`
      SELECT pa.id, pa.harga_total, pa.dp, pa.tanggal_pembelian, 
             COALESCE((SELECT SUM(jumlah_bayar) FROM payment_history WHERE assignment_id = pa.id), 0) as current_paid
      FROM property_assignments pa
      WHERE pa.tipe_pembayaran = 'kredit_kpr'
    `;
    
    console.log(`Found ${kprAssignments.length} KPR assignments.`);

    for (const pa of kprAssignments) {
      const kprAmount = Number(pa.harga_total || 0) - Number(pa.dp || 0);
      const remainingBalance = Number(pa.harga_total || 0) - Number(pa.current_paid || 0);
      const amountToInject = Math.min(kprAmount, remainingBalance);
      
      if (amountToInject > 0) {
        // Check if there's already an injected KPR payment
        const existingPaymentRes = await sql`
          SELECT id FROM payment_history 
          WHERE assignment_id = ${pa.id} AND catatan = 'Auto-injeksi Pencairan KPR'
        `;

        if (existingPaymentRes.length === 0) {
          console.log(`Injecting missing KPR payment for assignment ${pa.id}: ${amountToInject}`);
          
          try {
            await sql`
              INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan)
              SELECT ${pa.id}, ${amountToInject}, COALESCE(${pa.tanggal_pembelian}, NOW()), 'Auto-injeksi Pencairan KPR'
              FROM property_assignments WHERE id = ${pa.id}
            `;
          } catch (err) {
            console.log(`Failed to insert KPR payment for ${pa.id}: ${err.message}`);
          }
        }
      }
    }

    // 3. Global total_dibayar Resync
    console.log('Running global total_dibayar recalculation...');
    await sql`
      UPDATE property_assignments pa
      SET total_dibayar = COALESCE((
        SELECT SUM(jumlah_bayar) 
        FROM payment_history ph 
        WHERE ph.assignment_id = pa.id
      ), 0)
    `;

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
