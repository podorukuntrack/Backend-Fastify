import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const res = await db.execute(sql`
        SELECT 
          COALESCE(buyer.id, pa.id) as customer_id,
          COALESCE(buyer.nama, 'Customer (Belum Terdaftar)') as customer_name,
          COALESCE(buyer.nomor_telepon, '-') as customer_phone,
          comp.nama_pt as company_name,
          COUNT(pa.id) as total_units_bought,
          COALESCE(SUM(pa.harga_total), 0) as total_transaction_value
        FROM property_assignments pa
        LEFT JOIN users buyer ON pa.user_id = buyer.id
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON c.project_id = p.id
        JOIN companies comp ON p.company_id = comp.id
        WHERE pa.status_kepemilikan = 'active'
        GROUP BY COALESCE(buyer.id, pa.id), COALESCE(buyer.nama, 'Customer (Belum Terdaftar)'), COALESCE(buyer.nomor_telepon, '-'), comp.nama_pt
    `);
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit();
}

test();
