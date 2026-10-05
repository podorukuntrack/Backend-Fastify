# Risiko kontrak pilot yang berhasil direproduksi

Kontrak `TrackSyncAPI.md` dipertahankan, termasuk filter created_at lebih tua dari 5 detik. Temuan ini membutuhkan kesepakatan dengan PRSI sebelum sync dapat dinyatakan lossless. Menambah delay tetap atau menunggu gap 10 menit tidak menyelesaikan transaksi dengan durasi tak terbatas.

## Commit tidak berurutan

1. Transaksi A INSERT, memperoleh outbox seq N, tetapi tetap terbuka.
2. Transaksi B INSERT, memperoleh N+1, lalu commit.
3. Tunggu lebih dari 5 detik. GET events hanya melihat B. Cursor pembaca dapat maju ke N+1 (atau setelah timeout gap SI).
4. A commit. GET after_seq=N+1 tidak pernah mengembalikan N.

Dibuktikan oleh test `contract risk reproduced: long transaction...` pada PostgreSQL lokal dan VPS. `created_at=now()` merekam awal transaksi, bukan waktu commit. Test memiliki dua koneksi/transaksi bersamaan dan sequence gap akibat rollback. Replay event yang sudah terlihat stabil, tetapi ini tidak memulihkan event yang dilewati.

Usulan untuk pembahasan PRSI: publication cursor berdasarkan urutan commit (misalnya logical decoding/commit LSN, atau publisher yang menerbitkan delivery sequence hanya untuk transaksi committed dengan protokol watermark yang benar). Alternatif serialisasi transaksi penulis perlu desain locking, retry/deadlock, dan pengujian beban; bukan sekadar menambahkan sleep. Perubahan cursor/semantik harus disepakati kedua sisi, bukan diubah sepihak pada Track.

## Snapshot berpaginasi bukan satu snapshot global

1. Ambil halaman pertama, cutoff UUID X dan watermark M.
2. INSERT UUID Y < X, commit dengan seq M+1.
3. Halaman berikutnya meminta id > X: Y tidak ada, tetapi max_seq sekarang M+1.
4. Bila SI mengadopsi watermark akhir sebagai cursor awal incremental, Y hilang dari snapshot maupun incremental.

Test `contract risk reproduced: insert behind snapshot...` membuktikan kondisi tersebut. Setiap halaman Track konsisten secara internal menggunakan repeatable-read, tetapi antarhalaman memiliki snapshot berbeda, sebagaimana kontrak sekarang. UPDATE/DELETE selama pagination juga membutuhkan penanganan watermark dan tombstone yang benar.

Usulan: koordinasikan snapshot session/epoch dengan watermark awal yang aman, atau snapshot stabil lintas halaman. SI harus replay perubahan dari batas **sebelum** snapshot mulai, menerapkan row_version/tombstone secara idempoten, dan tidak mengganti batas awal menjadi max_seq halaman terakhir. Batas awal tetap harus bebas risiko commit tidak berurutan di atas.

## Batas penggunaan pilot

Untuk pilot terkontrol sekarang, lakukan snapshot saat tidak ada mutasi, rekonsiliasi setelah data stabil, dan mutasi satu transaksi selesai pada satu waktu. Ini batas operasional untuk eksperimen, bukan jaminan kontrak umum. Jangan gunakan ini untuk production atau menyatakan uji E2E/reliabilitas lulus. Simpan hasil reproduksi di handoff PRSI; worker SI pengujian belum diaktifkan oleh pekerjaan ini.
