# PRTrack staging pilot → PRSI

## Pembaruan checksum isi, 5 Oktober 2026

Branch `codex/staging-content-checksum` menambahkan checksum isi dan token monitor. Status ini menggantikan keterangan loopback-only dan runtime.env 0640 pada catatan provisioning historis di bawah. Production, Neon, workflow deploy, dan layanan/database PRSI tidak diubah.

- API kini bind **dua alamat eksplisit**: `127.0.0.1:3201` dan `10.11.26.196:3201`. Tidak ada bind wildcard. Allowlist aplikasi: `127.0.0.1`, `::1`, `10.11.20.216`; `trustProxy=false`. Unit systemd menolak semua alamat selain localhost dan `10.11.20.216/32`.
- `GET /sync/v2/checksum/{entity}`: `{ count, hash, content_hash, watermark }`. `hash` tetap MD5 id:versi. `content_hash` mengikuti spesifikasi bersama; `watermark` adalah string desimal xmin. Semuanya dibaca dalam satu transaksi `REPEATABLE READ READ ONLY`. v1 tetap `{ count, hash }`.
- Fungsi `public.sync_content_hash(entity text)` dan helper `public.sync_content_row_hash(entity text, r jsonb)` memakai whitelist berurutan. Null/missing menjadi `\N`, numeric memakai `trim_scale`, boolean lowercase, timestamp UTC enam digit mikrodetik, date ISO, JSON memakai `jsonb::text`, teks dipertahankan. Timestamp tanpa zona ditafsirkan UTC agar tidak bergantung pada timezone sesi. Baris customer hanya role customer.
- `TRACK_MONITOR_TOKEN` hanya mengizinkan GET health dan checksum v2. Events, snapshot, start, checksum v1, dan semua metode tulis ditolak. Token baca tetap bisa membaca semua endpoint sync; nilainya telah dirotasi.
- `/etc/prtrack-staging/read-token`, `/etc/prtrack-staging/monitor-token`, dan `/etc/prtrack-staging/runtime.env` kini root:root **0600**. systemd membaca EnvironmentFile sebagai root; proses API tetap user non-root. Jangan menjalankan ulang langkah chmod 0640 dari skrip aktivasi historis.
- Token monitor sudah disalurkan lewat SSH ke `/etc/prtrack-monitoring/track-staging-token` pada VPS monitoring, root-only 0600. Tidak ada secret dalam argumen CLI, hasil tes, atau repo.
- 21 vektor sintetis ada di `sync-tests/fixtures/content-hash-vectors.json`; salinan identik ada pada path relatif yang sama di backend PRSI. SHA-256: `474c7a7a23997417bf7df93ce5a1ba107e848707927207218fdc048a822f5ea2`.
- Backup sebelum perubahan: `/var/backups/prtrack-staging/checksum-20261005-191726/{files.tar.gz,database.dump}`. Arsip dan daftar restore DB berhasil dibaca. Backup berisi secret lama dan harus tetap root-only.

Lihat [CHECKSUM-HANDOFF.md](CHECKSUM-HANDOFF.md) untuk hasil, tujuh hash, akses monitoring, batas interpretasi, dan daftar cutover yang belum dijalankan. Bukti nonsecret disimpan di `staging/evidence/checksum-*`.

Rotasi berikutnya hanya setelah backup baru: jalankan `sudo node staging/rotate-checksum-tokens.js` di direktori aplikasi staging. Skrip membaca file root-only, memverifikasi identitas staging, mengganti kedua token, restart hanya API staging, dan memverifikasi token lama 401. Setelah rotasi, distribusikan token baru melalui kanal secret ke konsumen pengujian; jangan menjalankan skrip untuk sekadar pemeriksaan kesehatan.

Status 5 Oktober 2026: backend staging aktif di VPS `43.173.11.71`. Tidak ada merge/push/deploy ke production; frontend tidak dipasang. Branch lokal: `codex/prsi-sync-staging`. Workflow production hanya dipicu push `main`.

**Batas penting:** API siap untuk pengujian terkontrol. E2E dengan worker/database PRSI pengujian belum dijalankan. Dua risiko kehilangan event pada kontrak saat ini berhasil direproduksi; jangan menganggap incremental sync lossless atau mengaktifkan worker production. Lihat `CONTRACT-RISKS.md`.

## Resource aktual (tanpa secret)

| Resource | Nilai |
|---|---|
| Host | `ubuntu@43.173.11.71` |
| API | `http://127.0.0.1:3201` **di dalam VPS** |
| Health | `http://127.0.0.1:3201/health` |
| Service API | `prtrack-staging-api.service` |
| Aplikasi | `/opt/prtrack-staging/app` |
| User API | `prtrack-staging` |
| Runtime environment | `/etc/prtrack-staging/runtime.env`, root:prtrack-staging 0640 |
| Database | PostgreSQL 16.15, `127.0.0.1:55440`, database `prtrack_staging` |
| Runtime DB role | `prtrack_sync_reader`, SELECT saja, default transaksi read-only |
| Migration DB role | `prtrack_staging`, hanya cluster salinan |
| Identitas salinan | `b250172a-4dff-4439-b42e-5e8222c2e1f0`, database OID `16386` |
| Service DB | `prtrack-staging-db.service` |
| User/data DB | `prtrack-staging-db`, `/var/lib/prtrack-staging-db/data` |
| Binary DB portable | `/opt/prtrack-staging/pg16/usr/lib/postgresql/16/bin` |
| Secret migrasi | `/etc/prtrack-staging/migration.env`, root 0600 |
| Token baca | `/etc/prtrack-staging/read-token`, root 0600, acak 32 byte hex |
| Journal | namespace `prtrack-staging`, 32 MB, file 8 MB, retensi 7 hari |
| Log PostgreSQL | direktori data `/log`, rotasi nama hari, 7 hari |
| Batas API | CPU 40%, RAM 192 MiB |
| Batas DB | CPU 50%, RAM 320 MiB |

Port API/DB hanya loopback. Penggunaan HTTP loopback disetujui pemilik untuk worker PRSI **pengujian** `NODE_ENV=development` di VPS yang sama. Tidak ada perubahan nginx, domain, DNS, atau upstream PRSI. Worker container tidak dapat memakai loopback host tanpa desain jaringan tambahan; jangan mengganti bind menjadi publik.

Service PRSI tetap `podorukun-si-api.service`, direktori `/opt/podorukun-si/app`, bind `127.0.0.1:3100`, origin `https://podorukunsi.my.id`, prefix `/api/v1`. Health database/Redis/server PRSI tetap normal setelah provisioning dan tes.

## Salinan dan isolasi

Sumber yang dibaca adalah database Neon `neondb` pada `ep-wispy-sky-aoogi4me-pooler.c-2.ap-southeast-1.aws.neon.tech`. Backup memakai `pg_dump` custom, satu exported snapshot dari transaksi repeatable-read read-only, tanpa ownership/ACL dan lock-wait 5 detik. Jumlah baris dari snapshot yang sama disimpan dalam manifest. Tidak ada migrasi atau DML terhadap sumber.

Backup direstore ke cluster lokal baru sebelum migrasi sync. Seluruh 18 tabel public cocok jumlah barisnya dan constraint tervalidasi. Salinan kemudian disanitasi sebelum diekspor ke VPS: 3.221 refresh token dan 155 device token dihapus; semua password sumber menjadi nilai invalid, Apple token dihapus, notifikasi WA mati, akun sumber inactive. Semua teks bebas dimasking, email menjadi domain `example.invalid`, JSON bebas dikosongkan, URL/key storage dinetralkan. UUID dan FK tetap. Ditambahkan satu customer fixture `00000000-0000-4000-8000-000000000001`, `pilot@example.invalid`; akun ini tidak memiliki login/password aktif karena API pilot tidak menyediakan login.

VPS menerima **hanya hasil sanitasi**, tanpa environment, credential sumber, R2, Redis, mail, WA, push, payment, atau JWT production. Restore PostgreSQL 18 → 16 menghilangkan hanya statement `SET transaction_timeout = 0` yang tidak dikenal versi 16. Restore transaksi tunggal gagal jika ada error; schema/constraint/sequence dicek ulang. Tidak memasang paket PostgreSQL secara global: paket Ubuntu diekstrak ke direktori staging, sehingga tidak tercipta cluster/service default.

Runtime memuat hanya Fastify dan Postgres serta modul sync. Tidak memuat server bisnis, cron, BullMQ, Redis, auth, mail, WA, Firebase, gateway payment, webhook, atau storage. Tidak ada storage writer/mount/socket administratif. Attachment menggunakan nilai kosong/fixture, bukan storage production. Service API membatasi jaringan ke localhost dan tidak dapat mengakses direktori PRSI yang ditentukan di unit.

Guard mencocokkan endpoint/port/database/role dengan URL, nama database/role yang dikembalikan PostgreSQL, OID dan marker UUID salinan yang disanitasi. Role superuser/createdb/createrole/replication/bypassrls, role membership, serta kemampuan CONNECT ke database lain ditolak. Marker hanya dapat diubah administrator cluster; runtime/migrator mendapat SELECT saja. Startup/migrasi/tes memakai guard yang sama. Tes mutasi perlu `STAGING_TEST_CONFIRM` sama dengan UUID marker.

## Perubahan kode

- Tiga GET `/sync/v1/events`, `/sync/v1/snapshot/:entity`, `/sync/v1/checksum/:entity`; format mengikuti kontrak PRSI (`op`, `payload`, `row_version`, `created_at`, pagination lengkap).
- Whitelist tujuh entitas identik dengan kolom wajib kontrak. Field customer opsional yang tidak tersedia tidak direka.
- Snapshot per halaman memakai repeatable-read, `row_version`, `max_seq`, UUID text `COLLATE "C"`; checksum MD5 `id:sync_version` dengan collation yang sama.
- `staging/sync.sql`: versi BIGINT untuk tujuh tabel, transactional outbox, BEFORE version/AFTER event trigger, raw SQL/cascade/rollback, customer masuk/keluar role, tombstone null.
- Sequence versi global menjaga monotonisitas termasuk delete/reinsert UUID yang sama; gap diperbolehkan. Sequence ini berbeda dari cursor outbox.
- Kolom pembayaran ditambah kompatibel; pembayaran lama tetap `menunggu`, `dikunci_si=false`.
- Migrasi sync lama `drizzle/0004_sync_read_only.sql` kini menolak eksekusi; gunakan runner staging saja. Endpoint sync tidak diaktifkan di entrypoint bisnis lama.
- PUT jadwal/payment-lock tidak terdaftar, token baca tidak membuka akses tulis. DB runtime juga menolak DML.
- Bundle deployment minimal menggunakan lockfile tersendiri Fastify 5.12.5/Postgres 3.4.9; audit 0 temuan. Perubahan package.json/package-lock.json yang sudah ada sebelumnya di repo bukan bagian pekerjaan ini.

## Pengujian dan bukti

Enam kelompok integration test lulus pada salinan lokal, bundle deployment aktual, dan PostgreSQL VPS: guard, health/auth/error/allowlist/no-PUT, pagination+checksum tujuh entitas, raw SQL+role+delete/reinsert+cascade+rollback, transaksi commit tidak berurutan/gap/replay, perubahan selama pagination snapshot. Dua kelompok terakhir **membuktikan risiko kontrak**, bukan membuktikan risiko telah diperbaiki.

Pemeriksaan HTTP service aktual juga cocok untuk seluruh checksum; token salah 401, kedua PUT 404, role runtime tidak dapat UPDATE. Log API hanya startup generik; token/body/request tidak dicatat. Tidak ada worker atau notifier production di bundle. Tidak ada pembandingan bit-per-bit terhadap production yang terus dipakai pengguna; bukti isolasi adalah operasi sumber read-only, credential baru, host/cluster terpisah, guard, dan ketiadaan kode/secret integrasi pada runtime.

| Entitas | Baris snapshot stabil |
|---|---:|
| companies | 4 |
| projects | 17 |
| clusters | 55 |
| units | 467 |
| customers | 512 |
| assignments | 281 |
| payments | 1283 |

Bukti tanpa secret disimpan di VPS: `/etc/prtrack-staging/restore-evidence.json`, `runtime-evidence.json`, `integrity-evidence.json`. `sanitized-manifest.json` mencatat jumlah setelah sanitasi. Fixture yang dibuat integration test dibersihkan; event I/U/D pengujian tetap ada secara wajar di outbox.

## Handoff untuk chat PRSI (belum E2E)

Buat **instance/worker dan database PRSI pengujian terpisah**; jangan mengubah environment service PRSI aktif. Pertahankan satu akun DB PRSI, dbGuard aktif dan `ALLOW_UNSAFE_DB_ROLE=false`.

```dotenv
NODE_ENV=development
TRACK_API_URL=http://127.0.0.1:3201
TRACK_SYNC_TOKEN=<injeksi secret staging melalui kanal secret>
SYNC_WRITE_ENABLED=false
TRACK_SCHEDULE_TOKEN=
SYNC_ENABLED=false
ALLOW_UNSAFE_DB_ROLE=false
```

`TRACK_API_URL` tidak memiliki suffix `/sync/v1`. Operator mengambil token dari file root-only `/etc/prtrack-staging/read-token` melalui SSH/secret manager dan memasukkannya ke environment worker pengujian berizin terbatas. Jangan menempel token di chat, Git, command-line argument, dokumentasi, atau log. Jangan memberi worker akses ke file migrasi DB Track.

Sesudah database/worker PRSI pengujian terverifikasi dan risiko kontrak ditinjau, pemilik pilot dapat mengaktifkan sync pada instance tersebut saja, menarik ketujuh snapshot, menjalankan incremental, melakukan mutasi Track staging dengan credential migrasi, lalu rekonsiliasi hingga tujuh entitas cocok. Pantau error dan pastikan tidak ada PUT. Semua langkah E2E ini **belum dijalankan** dalam pekerjaan Track.

## Operasi dan rollback staging

Semua perintah berikut dijalankan di VPS melalui SSH.

```sh
sudo systemctl start prtrack-staging-db.service prtrack-staging-api.service
sudo systemctl stop prtrack-staging-api.service
# Jika seluruh staging hendak dihentikan:
sudo systemctl stop prtrack-staging-db.service
# Status / log:
systemctl status prtrack-staging-api.service prtrack-staging-db.service
sudo journalctl --namespace=prtrack-staging -u prtrack-staging-api.service
```

Rollback aman: matikan worker **PRSI pengujian**, stop API staging, pertahankan salinan DB untuk diagnosis. Jangan rollback/migrasi database sumber. Bila perlu mengulang baseline, buat cluster salinan baru dari backup tersanitasi, verifikasi manifest, buat marker UUID baru dan credential baru, lalu jalankan migrasi guarded. Jangan truncate outbox ketika SI masih memakai cursor lama; reset instance/cermin PRSI pengujian secara terkoordinasi.

Migrasi ulang (hanya salinan terverifikasi):

```sh
cd /opt/prtrack-staging/app
sudo node --env-file=/etc/prtrack-staging/migration.env staging/migrate.js
sudo node --env-file=/etc/prtrack-staging/runtime.env staging/verify-runtime.js
```

Untuk menjalankan test mutasi, gunakan shell root yang membaca `migration.env`, set `STAGING_TEST_CONFIRM` dari marker environment, kemudian `node --test sync-tests/sync.test.js`. Jangan menjalankan test saat worker SI sedang aktif. Script `activate-vps.sh` memuat urutan ini, tetapi aktivasi ulang bukan diperlukan untuk pemeriksaan read-only.

## Penghapusan

Gunakan `decommission-vps.sh` **hanya bila pemilik meminta menghapus staging**. Script memeriksa UUID instance dan realpath ketiga direktori sebelum menghapus, menghentikan hanya dua service staging, menghapus unit/config/credential/data staging dan dua user khusus. Tidak menyentuh `/opt/podorukun-si`, service PRSI, Redis PRSI, nginx, DNS, atau Neon sumber. Namespace journal staging dapat tersisa sampai retensi 7 hari; jangan menghapus journal sistem global.

Berkas temporary deployment `/tmp/prtrack-pilot-upload` dibersihkan sesudah verifikasi. Backup sumber lokal sementara bukan artifact untuk dibagikan; hanya manifest/schema dan bukti tanpa secret yang boleh masuk Git.

Cleanup selesai: backup sumber mentah dan cluster PostgreSQL lokal sementara telah dihapus setelah verifikasi VPS; bukti nonsecret tersimpan di staging/evidence/. Export salinan tersanitasi lokal tetap di direktori ignored .staging-local/ untuk rollback terkontrol.
