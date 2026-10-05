export const BUSINESS_FIELDS = Object.freeze({
  companies: ['id', 'nama_pt', 'kode_pt', 'alamat'],
  projects: ['id', 'company_id', 'nama_proyek', 'status'],
  clusters: ['id', 'project_id', 'nama_cluster'],
  units: ['id', 'cluster_id', 'nomor_unit', 'tipe_rumah', 'luas_tanah', 'luas_bangunan', 'status_pembangunan'],
  customers: ['id', 'nama', 'email', 'nomor_telepon'],
  assignments: ['id', 'user_id', 'unit_id', 'tipe_pembayaran', 'harga_total', 'dp', 'status_kepemilikan', 'tanggal_pembelian'],
  payments: ['id', 'assignment_id', 'jumlah_bayar', 'tanggal_bayar', 'catatan', 'bukti_pembayaran', 'is_auto_inject', 'created_at', 'jenis', 'status_verifikasi', 'rekening_tujuan', 'diverifikasi_oleh', 'diverifikasi_pada'],
});
export const SYNC_ENTITIES = Object.keys(BUSINESS_FIELDS);
// Sync is available only in the isolated staging entrypoint, never in the business server.
export function isSyncReadEnabled() { return false; }
export function assertEntity(entity) {
  if (!SYNC_ENTITIES.includes(entity)) throw Object.assign(new Error('Entitas tidak dikenal'), { statusCode: 404 });
}
