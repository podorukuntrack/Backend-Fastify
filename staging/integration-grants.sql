-- Run as the Track table/function owner after the provider creates both roles.
GRANT USAGE ON SCHEMA public TO prtrack_integration_reader,prtrack_integration_writer;
GRANT SELECT(id,nama_pt,kode_pt,alamat,sync_version) ON public.companies TO prtrack_integration_reader;
GRANT SELECT(id,company_id,nama_proyek,status,sync_version) ON public.projects TO prtrack_integration_reader;
GRANT SELECT(id,project_id,nama_cluster,sync_version) ON public.clusters TO prtrack_integration_reader;
GRANT SELECT(id,cluster_id,nomor_unit,tipe_rumah,luas_tanah,luas_bangunan,status_pembangunan,sync_version) ON public.units TO prtrack_integration_reader;
GRANT SELECT(id,nama,email,nomor_telepon,role,sync_version) ON public.users TO prtrack_integration_reader;
GRANT SELECT(id,user_id,unit_id,tipe_pembayaran,harga_total,dp,status_kepemilikan,tanggal_pembelian,sync_version) ON public.property_assignments TO prtrack_integration_reader;
GRANT SELECT(id,assignment_id,jumlah_bayar,tanggal_bayar,catatan,bukti_pembayaran,is_auto_inject,created_at,jenis,status_verifikasi,rekening_tujuan,diverifikasi_oleh,diverifikasi_pada,si_jadwal_id,sync_version) ON public.payment_history TO prtrack_integration_reader;
GRANT SELECT ON public.sync_outbox,public.sync_feed TO prtrack_integration_reader,prtrack_integration_writer;
GRANT EXECUTE ON FUNCTION public.sync_content_hash(text),public.sync_content_row_hash(text,jsonb),public.sync_business_payload(text,jsonb) TO prtrack_integration_reader;
GRANT SELECT ON public.si_schedules,public.si_sync_inbox,public.si_billing_config,public.property_assignments,public.payment_history TO prtrack_integration_writer;
GRANT INSERT,UPDATE ON public.si_schedules,public.si_sync_inbox TO prtrack_integration_writer;
GRANT UPDATE(status_si,alasan_si,jurnal_si,versi_si,dikunci_si,si_result_hash) ON public.payment_history TO prtrack_integration_writer;
GRANT UPDATE(si_contract_total,si_contract_version,total_dibayar) ON public.property_assignments TO prtrack_integration_writer;
GRANT USAGE ON SEQUENCE public.sync_row_version,public.sync_outbox_seq_seq TO prtrack_integration_writer;
GRANT INSERT ON public.sync_outbox TO prtrack_integration_writer;
