import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";
import { clearDashboardCache } from "../../shared/utils/cache.js";
import { AppError } from '../../shared/utils/AppError.js';

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
    dp: Number(row.dp ?? 0),
    total_dibayar: Number(row.total_dibayar ?? 0),
    jatuh_tempo_kpr: row.jatuh_tempo_kpr,
    reminder_kpr_dates: row.reminder_kpr_dates || [],
    tenor_bulan: row.tenor_bulan,
    keterangan_kpr: row.keterangan_kpr,
    persentase_dibayar: row.tipe_pembayaran === 'kredit_kpr'
      ? (Number(row.dp ?? 0) > 0 
          ? (function() {
              const kprAmount = Number(row.harga_total ?? 0) - Number(row.dp ?? 0);
              const customerPaid = Number(row.total_dibayar ?? 0) - kprAmount;
              return Math.min(Math.max((customerPaid / Number(row.dp)) * 100, 0), 100);
            })() 
          : 0)
      : (Number(row.harga_total ?? 0) > 0 ? Math.min((Number(row.total_dibayar ?? 0) / Number(row.harga_total)) * 100, 100) : 0),
  },
});

const normalizeOwnershipStatus = (status) => {
  if (status === 'cancelled' || status === 'completed') return 'inactive';
  return status;
};

export const findAllAssignments = async (userContext, filters = {}) => {
  const companyId = ["super_admin", "owner"].includes(userContext.role) ? null : userContext.companyId;
  const userId = userContext.role === "customer" ? userContext.sub : null;
  const clusterId = filters.cluster_id ?? filters.clusterId ?? null;
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
      pa.dp,
      pa.total_dibayar,
      pa.jatuh_tempo_kpr,
      pa.reminder_kpr_dates,
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
      AND (${clusterId}::uuid IS NULL OR u.cluster_id = ${clusterId}::uuid)
    ORDER BY pa.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map(mapAssignmentRow);
};

export const countAssignments = async (filters, userContext) => {
  const companyId = ["super_admin", "owner"].includes(userContext.role) ? null : userContext.companyId;
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
  const companyId = ["super_admin", "owner"].includes(userContext.role) ? null : userContext.companyId;
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
      pa.dp,
      pa.total_dibayar,
      pa.jatuh_tempo_kpr,
      pa.reminder_kpr_dates,
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
  let reminderDatesJson = [];
  if (data.reminder_kpr_dates && Array.isArray(data.reminder_kpr_dates)) {
    reminderDatesJson = data.reminder_kpr_dates.map(date => ({ date, sent: false }));
  }

  const rows = await db.execute(sql`
      INSERT INTO property_assignments (
        user_id,
        unit_id,
        tanggal_pembelian,
        status_kepemilikan,
        tipe_pembayaran,
        harga_total,
        dp,
        total_dibayar,
        jatuh_tempo_kpr,
        reminder_kpr_dates,
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
        ${data.dp ?? 0},
        0,
        ${data.jatuh_tempo_kpr ?? null},
        ${JSON.stringify(reminderDatesJson)},
        ${data.tenor_bulan ?? 0},
        ${data.keterangan_kpr ?? null},
        ${userContext.sub}
    )
    RETURNING id
  `);

  const assignmentId = rows[0].id;
  
  if (data.tipe_pembayaran === 'kredit_kpr') {
    const kprAmount = Number(data.harga_total ?? 0) - Number(data.dp ?? 0);
    if (kprAmount > 0) {
      await db.execute(sql`
        INSERT INTO payment_history (
          assignment_id, 
          jumlah_bayar, 
          tanggal_bayar, 
          catatan, 
          created_by
        ) VALUES (
          ${assignmentId}, 
          ${kprAmount}, 
          ${data.tanggal_pembelian ?? new Date().toISOString()}, 
          'Auto-injeksi Pencairan KPR', 
          ${userContext.sub}
        )
      `);
    }
  }

  await clearDashboardCache();

  return await findAssignmentById(assignmentId, userContext);
};

export const updateAssignment = async (id, data, userContext) => {
  const existing = await findAssignmentById(id, userContext);
  if (!existing) return null;

  /**
   * DATA NORMALIZATION FOR PAYMENT TYPE CHANGES
   * 
   * When an admin changes the payment type (e.g. from KPR to Cash Lunas), 
   * we must proactively nullify fields that are no longer relevant to prevent 
   * dirty data rendering on the frontend (like showing DP for Cash Lunas).
   * 
   * Rules:
   * - cash_lunas: No DP, No KPR details, No Tenor.
   * - cash_cicil: No DP, No KPR details. (Cicil relies on payment_history instead).
   * - kredit_kpr: No Tenor (bulan) used for Cash Cicil, but keeps DP and KPR details.
   */
  const newTipe = data.tipe_pembayaran || existing.pembayaran.tipe;
  if (newTipe === 'cash_lunas') {
    data.dp = null;
    data.jatuh_tempo_kpr = null;
    data.reminder_kpr_dates = [];
    data.tenor_bulan = null;
    data.keterangan_kpr = null;
  } else if (newTipe === 'cash_cicil') {
    data.dp = null;
    data.jatuh_tempo_kpr = null;
    data.reminder_kpr_dates = [];
    data.keterangan_kpr = null;
  } else if (newTipe === 'kredit_kpr') {
    data.tenor_bulan = null;
  }

  let reminderDatesJson = undefined;
  if (data.reminder_kpr_dates && Array.isArray(data.reminder_kpr_dates)) {
    reminderDatesJson = JSON.stringify(data.reminder_kpr_dates.map(date => ({ date, sent: false })));
  } else if (data.reminder_kpr_dates !== undefined) {
    reminderDatesJson = JSON.stringify([]);
  }

  const rows = await db.execute(sql`
    UPDATE property_assignments
       SET tanggal_pembelian = COALESCE(${data.tanggal_pembelian ?? null}, tanggal_pembelian),
           status_kepemilikan = COALESCE(${normalizeOwnershipStatus(data.status_kepemilikan) ?? null}, status_kepemilikan),
           tipe_pembayaran = COALESCE(${data.tipe_pembayaran ?? null}, tipe_pembayaran),
           harga_total = COALESCE(${data.harga_total ?? null}, harga_total),
           dp = ${data.dp !== undefined ? data.dp : sql`dp`},
           jatuh_tempo_kpr = ${data.jatuh_tempo_kpr !== undefined ? data.jatuh_tempo_kpr : sql`jatuh_tempo_kpr`},
           reminder_kpr_dates = ${reminderDatesJson !== undefined ? reminderDatesJson : sql`reminder_kpr_dates`},
           tenor_bulan = ${data.tenor_bulan !== undefined ? data.tenor_bulan : sql`tenor_bulan`},
           keterangan_kpr = ${data.keterangan_kpr !== undefined ? data.keterangan_kpr : sql`keterangan_kpr`},
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id
  `);

  if (data.tipe_pembayaran && data.tipe_pembayaran !== existing.pembayaran.tipe) {
    // Delete payment history on payment method change
    await db.execute(sql`DELETE FROM payment_history WHERE assignment_id = ${id}`);
    
    // Auto-inject KPR if changing to KPR
    if (data.tipe_pembayaran === 'kredit_kpr') {
      const kprAmount = Number(data.harga_total ?? existing.pembayaran.harga_total) - Number(data.dp ?? 0);
      if (kprAmount > 0) {
        await db.execute(sql`
          INSERT INTO payment_history (
            assignment_id, 
            jumlah_bayar, 
            tanggal_bayar, 
            catatan, 
            created_by
          ) VALUES (
            ${id}, 
            ${kprAmount}, 
            ${data.tanggal_pembelian ?? existing.tanggal_pembelian ?? new Date().toISOString()}, 
            'Auto-injeksi Pencairan KPR', 
            ${userContext.sub}
          )
        `);
      }
    }
  }

  await clearDashboardCache();
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

  const buktiPembayaran = Array.isArray(data.bukti_pembayaran) 
    ? JSON.stringify(data.bukti_pembayaran) 
    : (data.bukti_pembayaran ?? null);

  const rows = await db.execute(sql`
    INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_by)
    VALUES (${assignmentId}, ${data.jumlah_bayar}, ${data.tanggal_bayar ?? null}, ${data.catatan ?? null}, ${buktiPembayaran}, ${userContext.sub})
    RETURNING id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_at
  `);

  await clearDashboardCache();
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

  const buktiPembayaran = Array.isArray(data.bukti_pembayaran) 
    ? JSON.stringify(data.bukti_pembayaran) 
    : (data.bukti_pembayaran ?? null);

  // Update record pembayaran
  const rows = await db.execute(sql`
    UPDATE payment_history
       SET jumlah_bayar = COALESCE(${data.jumlah_bayar ?? null}, jumlah_bayar),
           tanggal_bayar = COALESCE(${data.tanggal_bayar ?? null}, tanggal_bayar),
           catatan = COALESCE(${data.catatan ?? null}, catatan),
           bukti_pembayaran = COALESCE(${buktiPembayaran}, bukti_pembayaran)
     WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
    RETURNING id, jumlah_bayar, tanggal_bayar, catatan, bukti_pembayaran, created_at
  `);

  if (rows.length === 0) return null;
  const newAmount = rows[0].jumlah_bayar;
  const diff = Number(newAmount) - Number(oldAmount);

  await clearDashboardCache();
  return rows[0];
};

export const deletePayment = async (assignmentId, paymentId, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  const handoverRes = await db.execute(sql`SELECT COUNT(*) as count FROM handovers WHERE unit_id = ${assignment.unit.id}`);
  if (Number(handoverRes[0].count) > 0) {
    throw new AppError("Gagal menghapus Pembayaran. Masih terdapat data Serah Terima. Harap hapus data Serah Terima terlebih dahulu.", 400);
  }

  // Hapus dari payment_history dan kembalikan jumlah yang dihapus
  const rows = await db.execute(sql`
    DELETE FROM payment_history
    WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
    RETURNING jumlah_bayar
  `);

  if (rows.length === 0) return null;
  const deletedAmount = rows[0].jumlah_bayar;

  await clearDashboardCache();
  return true;
};
export const checkDependencies = async (assignmentId, unitId) => {
  const errors = [];
  
  const timelineRes = await db.execute(sql`SELECT COUNT(*) as count FROM timelines WHERE unit_id = ${unitId}`);
  if (Number(timelineRes[0].count) > 0) errors.push('Timeline Pembangunan');

  return errors;
};

export const deleteAssignment = async (id, userContext) => {
  const existing = await findAssignmentById(id, userContext);
  if (!existing) return null;

  const dependencies = await checkDependencies(id, existing.unit.id);
  if (dependencies.length > 0) {
    throw new AppError(`Gagal menghapus Penugasan. Masih terdapat data ${dependencies.join(', ', 400)}. Harap hapus data tersebut terlebih dahulu.`);
  }

  const rows = await db.execute(sql`
    DELETE FROM property_assignments
    WHERE id = ${id}
    RETURNING id
  `);

  await clearDashboardCache();
  return rows[0];
};