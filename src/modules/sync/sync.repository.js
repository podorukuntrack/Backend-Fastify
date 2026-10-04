import { sql } from 'drizzle-orm';
import { db } from '../../config/database.js';

function rowsOf(result) {
  if (Array.isArray(result)) return result;
  return result?.rows || [];
}

const snapshotQueries = {
  companies: (after, limit) => sql`
    SELECT id, nama_pt, kode_pt, alamat, logo_url, theme_color, created_at, updated_at
      FROM companies
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
  projects: (after, limit) => sql`
    SELECT id, company_id, nama_proyek, deskripsi, lokasi, status, created_by, logo_url, theme_color, created_at, updated_at
      FROM projects
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
  clusters: (after, limit) => sql`
    SELECT id, project_id, nama_cluster, jumlah_unit, created_at, updated_at
      FROM clusters
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
  units: (after, limit) => sql`
    SELECT id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, image_url, created_at, updated_at
      FROM units
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
  customers: (after, limit) => sql`
    SELECT id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
      FROM users
     WHERE role = 'customer' AND (${after}::uuid IS NULL OR id > ${after}::uuid)
     ORDER BY id ASC LIMIT ${limit}
  `,
  assignments: (after, limit) => sql`
    SELECT id, user_id, unit_id, tanggal_pembelian, status_kepemilikan, tipe_pembayaran, harga_total, dp, total_dibayar, jatuh_tempo_kpr, reminder_kpr_dates, tenor_bulan, keterangan_kpr, created_at, updated_at
      FROM property_assignments
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
  payments: (after, limit) => sql`
    SELECT id, assignment_id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, is_auto_inject, created_by, created_at
      FROM payment_history
     WHERE ${after}::uuid IS NULL OR id > ${after}::uuid
     ORDER BY id ASC LIMIT ${limit}
  `,
};

export async function listEvents({ afterSeq, limit }) {
  const result = await db.execute(sql`
    SELECT seq, entity, entity_id, operation, occurred_at, payload
      FROM sync_outbox
     WHERE seq > ${afterSeq}
       AND occurred_at <= NOW() - INTERVAL '5 seconds'
     ORDER BY seq ASC
     LIMIT ${limit}
  `);
  return rowsOf(result);
}

export async function getMaxSeq() {
  const result = await db.execute(sql`SELECT COALESCE(MAX(seq), 0)::bigint AS max_seq FROM sync_outbox`);
  return rowsOf(result)[0]?.max_seq ?? 0;
}

export async function getSnapshotRows({ entity, pageAfterId, limit }) {
  const query = snapshotQueries[entity];
  if (!query) throw new Error(`Unsupported sync entity: ${entity}`);
  const result = await db.execute(query(pageAfterId, limit));
  return rowsOf(result);
}
