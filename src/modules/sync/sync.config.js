export const SYNC_ENTITIES = [
  'companies',
  'projects',
  'clusters',
  'units',
  'customers',
  'assignments',
  'payments',
];

// Kolom ini adalah satu-satunya kolom yang boleh keluar dari endpoint sync.
// Jangan menambahkan credential, token, hash password, atau secret ke daftar ini.
export const BUSINESS_FIELDS = Object.freeze({
  companies: ['id', 'nama_pt', 'kode_pt', 'alamat', 'logo_url', 'theme_color', 'created_at', 'updated_at'],
  projects: ['id', 'company_id', 'nama_proyek', 'deskripsi', 'lokasi', 'status', 'created_by', 'logo_url', 'theme_color', 'created_at', 'updated_at'],
  clusters: ['id', 'project_id', 'nama_cluster', 'jumlah_unit', 'created_at', 'updated_at'],
  units: ['id', 'cluster_id', 'nomor_unit', 'tipe_rumah', 'luas_tanah', 'luas_bangunan', 'status_pembangunan', 'progress_percentage', 'image_url', 'created_at', 'updated_at'],
  customers: ['id', 'company_id', 'nama', 'email', 'nomor_telepon', 'role', 'status', 'created_at', 'updated_at'],
  assignments: ['id', 'user_id', 'unit_id', 'tanggal_pembelian', 'status_kepemilikan', 'tipe_pembayaran', 'harga_total', 'dp', 'total_dibayar', 'jatuh_tempo_kpr', 'reminder_kpr_dates', 'tenor_bulan', 'keterangan_kpr', 'created_at', 'updated_at'],
  payments: ['id', 'assignment_id', 'jumlah_bayar', 'tanggal_bayar', 'catatan', 'bukti_pembayaran', 'is_auto_inject', 'created_by', 'created_at'],
});

export function isSyncReadEnabled(env = process.env) {
  const environment = String(env.NODE_ENV || '').toLowerCase();
  return env.SYNC_READ_ENABLED === 'true'
    && ['development', 'staging', 'test'].includes(environment)
    && Boolean(env.SYNC_READ_TOKEN);
}

export function assertEntity(entity) {
  if (!SYNC_ENTITIES.includes(entity)) {
    const error = new Error(`Unknown sync entity: ${entity}`);
    error.statusCode = 404;
    throw error;
  }
}
