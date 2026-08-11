import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";
import { clearDashboardCache } from "../../shared/utils/cache.js";
import { AppError } from '../../shared/utils/AppError.js';
import { notTestCompany } from '../../shared/utils/testCompany.js';

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
  // Lintas perusahaan untuk super_admin/owner, tapi tetap tanpa perusahaan tester.
  const scopeCompany = userContext.role === "customer"
    ? sql`1=1`
    : sql`((${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid) AND ${notTestCompany(sql`p.company_id`, userContext.companyId)})`;
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
    WHERE ${scopeCompany}
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
  // Lintas perusahaan untuk super_admin/owner, tapi tetap tanpa perusahaan tester.
  const scopeCompany = userContext.role === "customer"
    ? sql`1=1`
    : sql`((${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid) AND ${notTestCompany(sql`p.company_id`, userContext.companyId)})`;

  const rows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM property_assignments pa
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE ${scopeCompany}
      AND (${userId}::uuid IS NULL OR pa.user_id = ${userId}::uuid)
      AND (${filters.unitId ?? null}::uuid IS NULL OR pa.unit_id = ${filters.unitId ?? null}::uuid)
  `);

  return Number(rows[0].count);
};

export const findAssignmentById = async (id, userContext) => {
  const companyId = ["super_admin", "owner"].includes(userContext.role) ? null : userContext.companyId;
  const userId = userContext.role === "customer" ? userContext.sub : null;
  // Lintas perusahaan untuk super_admin/owner, tapi tetap tanpa perusahaan tester.
  const scopeCompany = userContext.role === "customer"
    ? sql`1=1`
    : sql`((${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid) AND ${notTestCompany(sql`p.company_id`, userContext.companyId)})`;

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
      AND ${scopeCompany}
      AND (${userId}::uuid IS NULL OR pa.user_id = ${userId}::uuid)
    LIMIT 1
  `);

  return rows[0] ? mapAssignmentRow(rows[0]) : null;
};

export const insertAssignment = async (data, userContext) => {
  let reminderDatesJson = "[]";
  if (data.reminder_kpr_dates && Array.isArray(data.reminder_kpr_dates)) {
    reminderDatesJson = JSON.stringify(data.reminder_kpr_dates);
  }

  // Divalidasi SEBELUM INSERT. Sebelumnya pemeriksaan ini berjalan setelah baris
  // assignment tersimpan, sehingga penolakan meninggalkan assignment yatim
  // tanpa payment_history pasangannya.
  if (data.tipe_pembayaran === 'kredit_kpr' && Number(data.dp ?? 0) > Number(data.harga_total ?? 0)) {
    throw new AppError("Down Payment (DP) tidak boleh melebihi Harga Total (NET).", 400);
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
        ${reminderDatesJson},
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
          is_auto_inject,
          created_by
        ) VALUES (
          ${assignmentId}, 
          ${kprAmount}, 
          ${data.tanggal_pembelian ?? new Date().toISOString()}, 
          'Auto-injeksi Pencairan KPR otomatis oleh sistem', 
          true,
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

  const isTipeChanged =
    !!data.tipe_pembayaran && data.tipe_pembayaran !== existing.pembayaran.tipe;

  /**
   * PENJAGA GANTI TIPE PEMBAYARAN
   *
   * Mengganti tipe pembayaran menghapus SELURUH payment_history assignment ini
   * (lihat blok di bawah). Tanpa penjaga, satu salah klik bisa melenyapkan
   * puluhan catatan pembayaran secara permanen — tidak ada soft delete maupun
   * audit log untuk memulihkannya.
   *
   * Baris auto-injeksi KPR tidak dihitung karena dibuat sistem, bukan dicatat
   * admin, sehingga assignment yang baru dibuat tetap bisa dikoreksi tipenya.
   */
  if (isTipeChanged) {
    const [manual] = await db.execute(sql`
      SELECT COUNT(*)::int AS jumlah
      FROM payment_history
      WHERE assignment_id = ${id}
        AND COALESCE(is_auto_inject, false) = false
    `);

    if (Number(manual.jumlah) > 0) {
      throw new AppError(
        `Tidak dapat mengubah tipe pembayaran: sudah ada ${manual.jumlah} catatan pembayaran ` +
        `pada penugasan ini. Hapus catatan pembayaran tersebut terlebih dahulu ` +
        `jika tipe pembayaran memang perlu diubah.`,
        400
      );
    }
  }

  /**
   * DATA NORMALIZATION FOR PAYMENT TYPE CHANGES
   * 
   * When an admin changes the payment type (e.g. from KPR to Cash Lunas), 
   * we must proactively nullify fields that are no longer relevant to prevent 
   * dirty data rendering on the frontend (like showing DP for Cash Lunas).
   * 
   * Rules:
   * - cash_lunas: No DP, No jatuh tempo, No reminder, No Tenor.
   * - cash_cicil: No DP, No Tenor. (Cicil relies on payment_history instead).
   * - kredit_kpr: No Tenor (bulan) used for Cash Cicil, but keeps DP and KPR details.
   *
   * keterangan_kpr TIDAK dibersihkan untuk tipe mana pun.
   * Namanya warisan dari masa fitur ini khusus KPR, tetapi sejak lama ia adalah
   * catatan umum: UI menampilkannya sebagai "Keterangan / Catatan", textarea-nya
   * dirender untuk semua tipe pembayaran, dan tampilan detail menampilkannya apa
   * adanya. Sebelumnya field ini di-null-kan saat tipe cash_lunas, sehingga admin
   * yang menyunting keterangan pada penugasan cash_lunas menerima pesan
   * "berhasil" tetapi isinya lenyap — UPDATE-nya memang sukses, hanya nilainya
   * yang sudah ditimpa null sebelum disimpan.
   */
  const newTipe = data.tipe_pembayaran || existing.pembayaran.tipe;
  if (newTipe === 'cash_lunas') {
    data.dp = null;
    data.jatuh_tempo_kpr = null;
    data.reminder_kpr_dates = [];
    data.tenor_bulan = null;
  } else if (newTipe === 'cash_cicil') {
    data.dp = null;
    data.tenor_bulan = null;
  } else if (newTipe === 'kredit_kpr') {
    data.tenor_bulan = null;
  }

  let reminderDatesJson = undefined;
  if (data.reminder_kpr_dates && Array.isArray(data.reminder_kpr_dates)) {
    reminderDatesJson = JSON.stringify(data.reminder_kpr_dates);
  } else if (data.reminder_kpr_dates !== undefined) {
    reminderDatesJson = JSON.stringify([]);
  }

  const rows = await db.execute(sql`
    UPDATE property_assignments
       SET user_id = COALESCE(${data.user_id ?? null}::uuid, user_id),
           tanggal_pembelian = COALESCE(${data.tanggal_pembelian ?? null}, tanggal_pembelian),
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

  if (isTipeChanged) {
    // Aman: penjaga di atas memastikan hanya baris auto-injeksi yang mungkin tersisa
    await db.execute(sql`DELETE FROM payment_history WHERE assignment_id = ${id}`);

    // Auto-inject KPR if changing to KPR
    if (data.tipe_pembayaran === 'kredit_kpr') {
      const dpAmount = Number(data.dp ?? 0);
      const hargaTotal = Number(data.harga_total ?? existing.pembayaran.harga_total);
      if (dpAmount > hargaTotal) {
        throw new AppError("Down Payment (DP) tidak boleh melebihi Harga Total (NET).", 400);
      }
      const kprAmount = hargaTotal - dpAmount;
      if (kprAmount > 0) {
        await db.execute(sql`
          INSERT INTO payment_history (
            assignment_id, 
            jumlah_bayar, 
            tanggal_bayar, 
            catatan, 
            is_auto_inject,
            created_by
          ) VALUES (
            ${id}, 
            ${kprAmount}, 
            ${data.tanggal_pembelian ?? existing.tanggal_pembelian ?? new Date().toISOString()}, 
            'Auto-injeksi Pencairan KPR otomatis oleh sistem', 
            true,
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
      ph.is_auto_inject,
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

  if (Number(data.jumlah_bayar) < 0) {
    const refundAmount = Math.abs(Number(data.jumlah_bayar));
    if (assignment.pembayaran.tipe === 'kredit_kpr') {
      const autoInjectRows = await db.execute(sql`
        SELECT id FROM payment_history
        WHERE assignment_id = ${assignmentId} AND (is_auto_inject = true OR catatan ILIKE '%auto-injeksi%')
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
          WHERE id = ${assignmentId}
        `);
      }
    } else {
      await db.execute(sql`
        UPDATE property_assignments
        SET harga_total = harga_total - ${refundAmount}, updated_at = NOW()
        WHERE id = ${assignmentId}
      `);
    }
  }

  await clearDashboardCache();
  return rows[0];
};

export const updatePayment = async (assignmentId, paymentId, data, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  // Cek apakah ini pembayaran auto-injeksi KPR
  const autoInjectCheckRows = await db.execute(sql`
    SELECT is_auto_inject, catatan, jumlah_bayar, tanggal_bayar FROM payment_history 
    WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
  `);
  const isAutoInject = autoInjectCheckRows.length > 0 && 
    (autoInjectCheckRows[0].is_auto_inject === true || 
     autoInjectCheckRows[0].catatan?.toLowerCase().includes('auto-injeksi'));
  
  if (isAutoInject) {
    const existing = autoInjectCheckRows[0];
    // Auto-injeksi hanya boleh diubah nominalnya (untuk koreksi pencairan bank)
    // Izinkan jika catatan/tanggal dikirim tapi nilainya sama (form mengirim semua field)
    const catatanChanged = data.catatan !== undefined && data.catatan !== existing.catatan;
    const tanggalChanged = data.tanggal_bayar !== undefined && 
      new Date(data.tanggal_bayar).toISOString().slice(0,10) !== new Date(existing.tanggal_bayar).toISOString().slice(0,10);
    
    if (catatanChanged || tanggalChanged) {
      throw new AppError(
        "Pembayaran Auto-injeksi Pencairan KPR hanya dapat diubah nominalnya. " +
        "Catatan dan tanggal tidak dapat diubah.",
        400
      );
    }

    // Validasi perubahan nominal auto-inject terhadap harga total dan DP yang sudah dibayar
    if (data.jumlah_bayar !== undefined) {
      const newKprAmount = Number(data.jumlah_bayar);
      const hargaTotal = assignment.pembayaran.harga_total;
      const oldKprAmount = Number(autoInjectCheckRows[0].jumlah_bayar);

      // KPR amount tidak boleh >= harga total
      if (newKprAmount >= hargaTotal) {
        throw new AppError(
          `Nominal pencairan KPR (${new Intl.NumberFormat('id-ID').format(newKprAmount)}) ` +
          `tidak boleh sama atau lebih besar dari harga total unit (${new Intl.NumberFormat('id-ID').format(hargaTotal)}).`,
          400
        );
      }

      if (newKprAmount <= 0) {
        throw new AppError("Nominal pencairan KPR harus lebih dari 0.", 400);
      }

      const newDp = hargaTotal - newKprAmount;

      // Hitung berapa DP yang sudah dibayar customer (total_dibayar - old kpr amount)
      const customerPaid = assignment.pembayaran.total_dibayar - oldKprAmount;

      // Jika KPR naik (DP turun), cek apakah customer sudah bayar melebihi DP baru
      if (customerPaid > newDp) {
        const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
        throw new AppError(
          `Tidak dapat mengubah pencairan KPR menjadi ${fmt(newKprAmount)} ` +
          `karena DP baru akan menjadi ${fmt(newDp)}, ` +
          `sedangkan customer sudah membayar DP sebesar ${fmt(customerPaid)}. ` +
          `Hapus sebagian pembayaran DP terlebih dahulu sebelum mengubah nominal pencairan.`,
          400
        );
      }
    }
  }

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

  // Jika auto-inject berubah, sinkronkan DP di property_assignments
  if (isAutoInject && diff !== 0) {
    const newDp = assignment.pembayaran.harga_total - Number(newAmount);
    await db.execute(sql`
      UPDATE property_assignments
         SET dp = ${newDp},
             updated_at = NOW()
       WHERE id = ${assignmentId}
    `);
  }

  // Tangani penyesuaian untuk refund (pembayaran negatif)
  const oldRefundEffect = Number(oldAmount) < 0 ? Math.abs(Number(oldAmount)) : 0;
  const newRefundEffect = Number(newAmount) < 0 ? Math.abs(Number(newAmount)) : 0;
  const refundDiff = newRefundEffect - oldRefundEffect;

  if (refundDiff !== 0) {
    if (assignment.pembayaran.tipe === 'kredit_kpr') {
      const autoInjectRows = await db.execute(sql`
        SELECT id FROM payment_history
        WHERE assignment_id = ${assignmentId} AND (is_auto_inject = true OR catatan ILIKE '%auto-injeksi%')
        LIMIT 1
      `);
      if (autoInjectRows.length > 0 && autoInjectRows[0].id !== paymentId) {
        await db.execute(sql`
          UPDATE payment_history 
          SET jumlah_bayar = jumlah_bayar + ${refundDiff}
          WHERE id = ${autoInjectRows[0].id}
        `);
        await db.execute(sql`
          UPDATE property_assignments
          SET dp = dp - ${refundDiff}, updated_at = NOW()
          WHERE id = ${assignmentId}
        `);
      }
    } else {
      await db.execute(sql`
        UPDATE property_assignments
        SET harga_total = harga_total - ${refundDiff}, updated_at = NOW()
        WHERE id = ${assignmentId}
      `);
    }
  }

  await clearDashboardCache();
  return rows[0];
};

export const deletePayment = async (assignmentId, paymentId, userContext) => {
  const assignment = await findAssignmentById(assignmentId, userContext);
  if (!assignment) return null;

  // Validasi bahwa unit data tersedia pada assignment
  const unitId = assignment?.unit?.id;
  if (!unitId) {
    throw new AppError("Data unit tidak ditemukan pada assignment ini. Silakan periksa data assignment.", 400);
  }

  // Validasi bahwa payment yang akan dihapus memang ada
  const paymentCheck = await db.execute(sql`
    SELECT id, is_auto_inject, catatan FROM payment_history 
    WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
  `);
  if (paymentCheck.length === 0) {
    throw new AppError("Data pembayaran tidak ditemukan atau sudah terhapus.", 404);
  }

  // Cek apakah ini pembayaran auto-injeksi KPR — tidak boleh dihapus
  const payment = paymentCheck[0];
  if (payment.is_auto_inject === true || 
      payment.catatan?.toLowerCase().includes('auto-injeksi')) {
    throw new AppError(
      "Pembayaran Auto-injeksi Pencairan KPR tidak dapat dihapus. " +
      "Record ini adalah pencatatan otomatis pencairan dana KPR dari bank. " +
      "Jika ingin mengubah skema pembayaran, silakan ubah tipe pembayaran di Tab Assignment.",
      400
    );
  }

  // Cek apakah ada data serah terima (handover) — jika ada, blokir penghapusan
  const handoverRes = await db.execute(sql`SELECT COUNT(*) as count FROM handovers WHERE unit_id = ${unitId}`);
  if (handoverRes.length > 0 && Number(handoverRes[0].count) > 0) {
    throw new AppError("Gagal menghapus Pembayaran. Masih terdapat data Serah Terima. Harap hapus data Serah Terima terlebih dahulu.", 400);
  }

  // Hapus dari payment_history dan kembalikan jumlah yang dihapus
  const rows = await db.execute(sql`
    DELETE FROM payment_history
    WHERE id = ${paymentId} AND assignment_id = ${assignmentId}
    RETURNING jumlah_bayar
  `);

  if (rows.length === 0) return null;
  const deletedAmount = Number(rows[0].jumlah_bayar);

  if (deletedAmount < 0) {
    const refundAmount = Math.abs(deletedAmount);
    if (assignment.pembayaran.tipe === 'kredit_kpr') {
      const autoInjectRows = await db.execute(sql`
        SELECT id FROM payment_history
        WHERE assignment_id = ${assignmentId} AND (is_auto_inject = true OR catatan ILIKE '%auto-injeksi%')
        LIMIT 1
      `);
      if (autoInjectRows.length > 0) {
        await db.execute(sql`
          UPDATE payment_history 
          SET jumlah_bayar = jumlah_bayar - ${refundAmount}
          WHERE id = ${autoInjectRows[0].id}
        `);
        await db.execute(sql`
          UPDATE property_assignments
          SET dp = dp + ${refundAmount}, updated_at = NOW()
          WHERE id = ${assignmentId}
        `);
      }
    } else {
      await db.execute(sql`
        UPDATE property_assignments
        SET harga_total = harga_total + ${refundAmount}, updated_at = NOW()
        WHERE id = ${assignmentId}
      `);
    }
  }

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