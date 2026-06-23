import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";

const mapAssignmentRow = (row) => ({
  id: row.id,
  tanggal_pembelian: row.tanggal_pembelian,
  status_kepemilikan: row.status_kepemilikan,
  created_at: row.created_at,
  updated_at: row.updated_at,
  user: {
    id: row.user_id,
    nama: row.user_nama,
    email: row.user_email,
  },
  unit: {
    id: row.unit_id,
    nomor_unit: row.nomor_unit,
    tipe_rumah: row.tipe_rumah,
    gambar_rumah: row.image_url,
    image_url: row.image_url,
    cluster: {
      id: row.cluster_id,
      nama_cluster: row.nama_cluster,
      project: {
        id: row.project_id,
        nama_proyek: row.nama_proyek,
      },
    },
  },
  pembayaran: {
    tipe: row.tipe_pembayaran,
    harga_total: Number(row.harga_total ?? 0),
    total_dibayar: Number(row.total_dibayar ?? 0),
    tenor_bulan: row.tenor_bulan,
    keterangan_kpr: row.keterangan_kpr,
    persentase_dibayar: Number(row.harga_total ?? 0) > 0
      ? Math.min((Number(row.total_dibayar ?? 0) / Number(row.harga_total)) * 100, 100)
      : 0,
  },
});

const normalizeOwnershipStatus = (status) => {
  if (status === 'cancelled' || status === 'completed') return 'inactive';
  return status;
};

export const findAllAssignments = async (userContext, filters = {}) => {
  const companyId = userContext.role === "super_admin" ? null : userContext.companyId;
  const userId = userContext.role === "customer" ? userContext.sub : null;
  const limit = Number(filters.limit ?? 20);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  const rows = await db.execute(sql`
    SELECT
      pa.id,
      pa.user_id,
      buyer.nama AS user_nama,
      buyer.email AS user_email,
      pa.unit_id,
      u.nomor_unit,
      u.tipe_rumah,
      u.image_url,
      c.id AS cluster_id,
      c.nama_cluster,
      p.id AS project_id,
      p.nama_proyek,
      pa.tanggal_pembelian,
      pa.status_kepemilikan,
      pa.tipe_pembayaran,
      pa.harga_total,
      pa.total_dibayar,
      pa.tenor_bulan,
      pa.keterangan_kpr,
      pa.created_at,
      pa.updated_at
    FROM property_assignments pa
    JOIN users buyer ON buyer.id = pa.user_id
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${userId}::uuid IS NULL OR pa.user_id = ${userId}::uuid)
      AND (${filters.unitId ?? null}::uuid IS NULL OR pa.unit_id = ${filters.unitId ?? null}::uuid)
    ORDER BY pa.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map(mapAssignmentRow);
};

export const countAssignments = async (filters, userContext) => {
  const companyId = userContext.role === "super_admin" ? null : userContext.companyId;
  const userId = userContext.role === "customer" ? userContext.sub : null;

  const rows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM property_assignments pa
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${userId}::uuid IS NULL OR pa.user_id = ${userId}::uuid)
      AND (${filters.unitId ?? null}::uuid IS NULL OR pa.unit_id = ${filters.unitId ?? null}::uuid)
  `);

  return Number(rows[0].count);
};

export const findAssignmentById = async (id, userContext) => {
  const companyId = userContext.role === "super_admin" ? null : userContext.companyId;
  const userId = userContext.role === "customer" ? userContext.sub : null;

  const rows = await db.execute(sql`
    SELECT
      pa.id,
      pa.user_id,
      buyer.nama AS user_nama,
      buyer.email AS user_email,
      pa.unit_id,
      u.nomor_unit,
      u.tipe_rumah,
      u.image_url,
      c.id AS cluster_id,
      c.nama_cluster,
      p.id AS project_id,
      p.nama_proyek,
      pa.tanggal_pembelian,
      pa.status_kepemilikan,
      pa.tipe_pembayaran,
      pa.harga_total,
      pa.total_dibayar,
      pa.tenor_bulan,
      pa.keterangan_kpr,
      pa.created_at,
      pa.updated_at
    FROM property_assignments pa
    JOIN users buyer ON buyer.id = pa.user_id
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE pa.id = ${id}
      AND (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${userId}::uuid IS NULL OR pa.user_id = ${userId}::uuid)
    LIMIT 1
  `);

  return rows[0] ? mapAssignmentRow(rows[0]) : null;
};

export const insertAssignment = async (data, userContext) => {
  const rows = await db.execute(sql`
    INSERT INTO property_assignments (
      user_id,
      unit_id,
      tanggal_pembelian,
      status_kepemilikan,
      tipe_pembayaran,
      harga_total,
      total_dibayar,
      tenor_bulan,
      keterangan_kpr,
      created_by
    )
    VALUES (
      ${data.user_id},
      ${data.unit_id},
      ${data.tanggal_pembelian ?? null},
      ${normalizeOwnershipStatus(data.status_kepemilikan) ?? 'active'},
      ${data.tipe_pembayaran ?? 'cash_lunas'},
      ${data.harga_total ?? 0},
      0,
      ${data.tenor_bulan ?? 0},
      ${data.keterangan_kpr ?? null},
      ${userContext.sub}
    )
    RETURNING id
  `);

  const assignmentId = rows[0].id;

  if (data.tipe_pembayaran === 'cash_lunas' && data.harga_total > 0) {
    await insertPayment(assignmentId, {
      jumlah_bayar: data.harga_total,
      tanggal_bayar: data.tanggal_pembelian || new Date().toISOString(),
      catatan: "Pembayaran Cash Lunas otomatis",
      bukti_pembayaran: data.bukti_pembayaran || null
    }, userContext);
  }

  return await findAssignmentById(assignmentId, userContext);
};

export const updateAssignment = async (id, data, userContext) => {
  const existing = await findAssignmentById(id, userContext);
  if (!existing) return null;

  const rows = await db.execute(sql`
    UPDATE property_assignments
       SET tanggal_pembelian = COALESCE(${data.tanggal_pembelian ?? null}, tanggal_pembelian),
           status_kepemilikan = COALESCE(${normalizeOwnershipStatus(data.status_kepemilikan) ?? null}, status_kepemilikan),
           tipe_pembayaran = COALESCE(${data.tipe_pembayaran ?? null}, tipe_pembayaran),
           harga_total = COALESCE(${data.harga_total ?? null}, harga_total),
           tenor_bulan = COALESCE(${data.tenor_bulan ?? null}, tenor_bulan),
           keterangan_kpr = COALESCE(${data.keterangan_kpr ?? null}, keterangan_kpr),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id
  `);

  if (data.tipe_pembayaran === 'cash_lunas' && existing.pembayaran?.tipe !== 'cash_lunas' && data.harga_total > 0) {
    // Bersihkan cicilan sebelumnya agar tidak tumpang tindih
    await db.execute(sql`DELETE FROM payment_history WHERE assignment_id = ${id}`);

    await insertPayment(id, {
      jumlah_bayar: data.harga_total,
      tanggal_bayar: data.tanggal_pembelian || new Date().toISOString(),
      catatan: "Pelunasan Cash Lunas otomatis (Perubahan Metode)",
      bukti_pembayaran: data.bukti_pembayaran || null
    }, userContext);
  }

  return await findAssignmentById(rows[0].id, userContext);
};

export const findPaymentsByAssignmentId = async (assignmentId, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  return await db.execute(sql`
    SELECT
      ph.id,
      ph.jumlah_bayar,
      ph.tanggal_bayar,
      ph.catatan,
      ph.bukti_pembayaran,
      ph.created_at,
      creator.nama AS dicatat_oleh
    FROM payment_history ph
    LEFT JOIN users creator ON creator.id = ph.created_by
    WHERE ph.assignment_id = ${assignmentId}
    ORDER BY ph.tanggal_bayar DESC, ph.created_at DESC
  `);
};

export const insertPayment = async (assignmentId, data, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  const rows = await db.execute(sql`
    INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_by)
    VALUES (${assignmentId}, ${data.jumlah_bayar}, ${data.tanggal_bayar ?? null}, ${data.catatan ?? null}, ${data.bukti_pembayaran ?? null}, ${userContext.sub})
    RETURNING id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_at
  `);

  return rows[0];
};

export const updatePayment = async (assignmentId, paymentId, data, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  // Dapatkan nominal pembayaran sebelumnya
  const oldPaymentRows = await db.execute(sql`
    SELECT jumlah_bayar FROM payment_history WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
  `);
  if (oldPaymentRows.length === 0) return null;
  const oldAmount = oldPaymentRows[0].jumlah_bayar;

  // Update record pembayaran
  const rows = await db.execute(sql`
    UPDATE payment_history
       SET jumlah_bayar = COALESCE(${data.jumlah_bayar ?? null}, jumlah_bayar),
           tanggal_bayar = COALESCE(${data.tanggal_bayar ?? null}, tanggal_bayar),
           catatan = COALESCE(${data.catatan ?? null}, catatan),
           bukti_pembayaran = COALESCE(${data.bukti_pembayaran ?? null}, bukti_pembayaran)
     WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
    RETURNING id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_at
  `);

  if (rows.length === 0) return null;
  const newAmount = rows[0].jumlah_bayar;
  const diff = Number(newAmount) - Number(oldAmount);

  return rows[0];
};

export const deletePayment = async (assignmentId, paymentId, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  // Hapus dari payment_history dan kembalikan jumlah yang dihapus
  const rows = await db.execute(sql`
    DELETE FROM payment_history
    WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
    RETURNING jumlah_bayar
  `);

  if (rows.length === 0) return null;
  const deletedAmount = rows[0].jumlah_bayar;

  return true;
};
export const checkDependencies = async (assignmentId, unitId) => {
  const errors = [];
  
  const paymentRes = await db.execute(sql`SELECT COUNT(*) as count FROM payment_history WHERE assignment_id = ${assignmentId}`);
  if (Number(paymentRes[0].count) > 0) errors.push('Riwayat Pembayaran');

  const timelineRes = await db.execute(sql`SELECT COUNT(*) as count FROM timelines WHERE unit_id = ${unitId}`);
  if (Number(timelineRes[0].count) > 0) errors.push('Timelines');

  const progressRes = await db.execute(sql`SELECT COUNT(*) as count FROM progress WHERE unit_id = ${unitId}`);
  if (Number(progressRes[0].count) > 0) errors.push('Progress Pembangunan');

  const handoverRes = await db.execute(sql`SELECT COUNT(*) as count FROM handovers WHERE unit_id = ${unitId}`);
  if (Number(handoverRes[0].count) > 0) errors.push('Serah Terima');

  const retentionRes = await db.execute(sql`SELECT COUNT(*) as count FROM retentions WHERE unit_id = ${unitId}`);
  if (Number(retentionRes[0].count) > 0) errors.push('Retensi / Garansi');

  return errors;
};

export const deleteAssignment = async (id, userContext) => {
  const existing = await findAssignmentById(id, userContext);
  if (!existing) return null;

  const dependencies = await checkDependencies(id, existing.unit.id);
  if (dependencies.length > 0) {
    throw new Error(`Tidak dapat membatalkan penugasan. Harap hapus data berikut terlebih dahulu: ${dependencies.join(', ')}`);
  }

  const rows = await db.execute(sql`
    DELETE FROM property_assignments
    WHERE id = ${id}
    RETURNING id
  `);

  return rows[0];
};