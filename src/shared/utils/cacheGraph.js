// src/shared/utils/cacheGraph.js
import { clearCachePattern } from './cache.js';

/**
 * Peta ketergantungan cache.
 *
 * MASALAH YANG DISELESAIKAN
 * Sebelumnya setiap handler menuliskan sendiri daftar clearCachePattern-nya —
 * lebih dari 40 pemanggilan tersebar. Daftar itu melenceng dari kenyataan karena
 * hampir semuanya melupakan nilai turunan hasil JOIN. Contoh: mengganti nama
 * proyek hanya membersihkan `projects:*`, padahal daftar unit, cluster, dan
 * penugasan sama-sama menampilkan `p.nama_proyek`, sehingga nama lama bertahan
 * di layar sampai TTL habis — dan refresh browser tidak menolong sama sekali,
 * karena yang basi ada di Redis, bukan di peramban.
 *
 * Sekarang ketergantungannya dinyatakan sekali di sini dan bisa diperiksa.
 *
 * PRINSIP: LEBIH BAIK BERLEBIH DARIPADA KURANG
 * Membersihkan cache yang sebenarnya tidak terpengaruh hanya berbiaya satu
 * cache miss. Melewatkan yang terpengaruh berarti menampilkan data salah.
 * Karena itu daftarnya sengaja longgar.
 */

/**
 * Awalan kunci cache yang dipakai di seluruh aplikasi.
 * Perhatikan `units` dan `unit` adalah DUA awalan berbeda:
 *   units:list / units:detail   (daftar unit)
 *   unit:detail_stats           (detail unit, dipakai aplikasi mobile)
 * Membersihkan 'units:*' TIDAK menyentuh 'unit:detail_stats:*'.
 */
const DEPENDENTS = {
  company: ['companies', 'projects', 'units', 'unit', 'users', 'dashboard'],

  project: ['projects', 'clusters', 'units', 'unit', 'assignments', 'dashboard'],

  cluster: ['clusters', 'units', 'unit', 'assignments', 'dashboard'],

  // nomor_unit muncul di daftar penugasan dan dokumentasi
  unit: ['units', 'unit', 'clusters', 'projects', 'assignments', 'documentations', 'dashboard'],

  // penugasan KPR menyuntik baris payment_history otomatis -> riwayat bayar mobile ikut berubah
  assignment: ['assignments', 'payments', 'units', 'unit', 'users', 'projects', 'dashboard'],

  payment: ['payments', 'assignments', 'retentions', 'units', 'unit', 'projects', 'dashboard'],

  // nama & email pembeli muncul di daftar penugasan
  user: ['users', 'assignments', 'dashboard'],

  // progress mengubah units.progress_percentage dan status timeline
  progress: ['progress', 'timelines', 'units', 'unit', 'documentations', 'projects', 'dashboard'],

  timeline: ['timelines', 'progress', 'units', 'unit', 'dashboard'],

  handover: ['handovers', 'units', 'unit', 'projects', 'dashboard'],

  retention: ['retentions', 'assignments', 'units', 'unit', 'projects', 'dashboard'],

  // jumlah komplain berstatus pending adalah sumber angka open_tickets di dashboard
  complaint: ['retentions', 'dashboard'],

  documentation: ['documentations', 'units', 'unit', 'projects', 'dashboard'],

  banner: ['banners'],
};

/**
 * Membersihkan seluruh cache yang terpengaruh oleh perubahan pada satu entitas.
 * Tidak pernah melempar: kegagalan pembersihan cache tidak boleh menggagalkan
 * operasi yang sudah berhasil tersimpan.
 *
 * @param {keyof DEPENDENTS} entity
 */
export const invalidateFor = async (entity) => {
  const prefixes = DEPENDENTS[entity];

  if (!prefixes) {
    console.error(`[Cache] Entitas tidak dikenal: "${entity}" — tidak ada cache yang dibersihkan`);
    return;
  }

  await Promise.all(
    prefixes.map((p) =>
      clearCachePattern(`${p}:*`).catch((err) =>
        console.error(`[Cache] Gagal membersihkan ${p}:*`, err.message)
      )
    )
  );
};

/** Dibuka untuk keperluan pengujian dan audit. */
export const cacheDependents = DEPENDENTS;
