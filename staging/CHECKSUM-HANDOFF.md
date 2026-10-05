# Handoff checksum isi untuk PRSI — 5 Oktober 2026

## Endpoint dan akses

Base URL staging: `http://10.11.26.196:3201` dari VPS monitoring `43.157.230.218` / `10.11.20.216`. Akses lokal tetap `http://127.0.0.1:3201`. API tidak bind wildcard. Selain loopback, hanya IP monitoring diterima aplikasi dan systemd.

`GET /sync/v2/checksum/{entity}` dengan bearer token monitor mengembalikan:

```json
{"count":4,"hash":"d134e4dd132eefa83a6d95721396cc95","content_hash":"ac5d04ba4e009fc6130b8a60b1ac97d8","watermark":"889"}
```

`count` number; kedua hash string MD5; `watermark` string desimal `pg_snapshot_xmin`, satu snapshot repeatable-read read-only dengan seluruh hasil checksum. v1 tidak berubah. Token monitor tidak memperoleh payload bisnis. Health tetap kompatibel dengan respons lama.

Secret **tidak dicantumkan**. Lokasi root-only 0600:

- Track staging: `/etc/prtrack-staging/monitor-token` (`TRACK_MONITOR_TOKEN`).
- VPS monitoring: `/etc/prtrack-monitoring/track-staging-token` (salinan via pipe SSH).
- Token baca baru: `/etc/prtrack-staging/read-token`; hanya konsumen sync pengujian yang boleh menerimanya.
- Runtime environment staging: `/etc/prtrack-staging/runtime.env`, kini 0600, dibaca systemd sebagai root.

Token baca lama sudah dicabut. Konfigurasi layanan PRSI tidak diperbarui; sesi PRSI perlu mengambil token baru melalui kanal secret untuk konsumen staging yang diotorisasi. Jangan menaruh token dalam argumen command, sudo env, Git, log, atau chat.

## Spesifikasi dan fixture bersama

`public.sync_content_hash(entity text)` memakai helper `public.sync_content_row_hash(entity text, r jsonb)`. Urutan whitelist identik dengan `BUSINESS_FIELDS` dan `sync_business_payload`, tanpa id; id menjadi prefiks. Normalisasi tepat sesuai permintaan bersama: null/missing `\N`, `trim_scale(numeric)::text`, boolean lowercase, timestamp UTC enam digit mikrodetik, date ISO, JSON `jsonb::text`, teks apa adanya.

`row_hash = md5(id || '|' || f1 || '|' || ...)`; `content_hash = md5(string_agg(id || ':' || row_hash, ',' ORDER BY id::text COLLATE "C"))`, kosong `md5('')`. Customer dibatasi role customer, entitas lain memakai baris yang sama dengan checksum v1.

Fixture 21 baris sintetis (3 per entitas) beserta normalisasi, serialisasi, dan expected row_hash:

- Track: `sync-tests/fixtures/content-hash-vectors.json`.
- Salinan lokal PRSI: `D:\PodoRukun\PodorukunSI\backend\sync-tests\fixtures\content-hash-vectors.json`.
- SHA-256 keduanya: `474c7a7a23997417bf7df93ce5a1ba107e848707927207218fdc048a822f5ea2`.

Mencakup null/missing, desimal ber-skala, boolean, tanggal, mikrodetik dan offset timestamp, array bukti, objek JSON, dan teks kosong. PRSI perlu menjalankan fixture ini terhadap implementasinya sendiri sebelum menyatakan cocok. Tidak ada perubahan pada database, layanan, atau direktori aplikasi PRSI di VPS.

## Bukti staging

- **15/15 tes lulus**, 0 gagal, 0 dilewati. Seluruh 10 tes lama tetap lulus. Migrasi dijalankan ulang dengan sukses untuk memeriksa idempotensi.
- Tes baru membuktikan vektor cocok, v1 tidak berubah, snapshot konsisten saat commit bersamaan, perubahan whitelist tanpa kenaikan versi terdeteksi, perubahan kolom di luar whitelist diabaikan, trigger kembali aktif setelah rollback, token monitor terbatas, allowlist dan penolakan spoof `X-Forwarded-For`.
- Layanan nyata: token baca lama **401**, token baca baru **200**, checksum monitor **200**, events/snapshot/start/PUT monitor **403**.
- Dari monitoring: seluruh tujuh checksum diterima. Events dan snapshot v1/v2, start v2, serta PUT mendapat **403**.
- Listener aktual: `127.0.0.1:3201`, `10.11.26.196:3201`; DB tetap `127.0.0.1:55440`.
- Probe `43.173.11.71:3201` dari VPS monitoring dan host Windows eksternal sama-sama **timeout**. Hasil membuktikan tidak terjangkau dari dua sumber tersebut saat tes; bukan jaminan konfigurasi cloud masa depan.
- Service API staging dan `podorukun-si-api.service` sama-sama active setelah aktivasi. Layanan PRSI tidak diubah/restart.

Bukti repo: `evidence/checksum-tests.tap`, `evidence/checksum-evidence.json`, `evidence/checksum-monitor-network.json`. Bukti rotasi juga tersimpan di `/etc/prtrack-staging/checksum-evidence.json` pada VPS Track.

Hasil dari VPS monitoring, **5 Oktober 2026 22:58 WIB**, watermark `889`:

| Entitas | Count | content_hash |
|---|---:|---|
| companies | 4 | `ac5d04ba4e009fc6130b8a60b1ac97d8` |
| projects | 17 | `90208ed8d9e06e88d895251b601a8492` |
| clusters | 55 | `3c7c03dac445673a3f7254a81b2ad76f` |
| units | 467 | `c185252caa0e8b20dea1eaea8e0e07b2` |
| customers | 512 | `b7a931deaf8cb7f16f4d71d7692803f0` |
| assignments | 281 | `298a14f2a8da3df025da31b5904d1409` |
| payments | 1283 | `3cb1a10bb557f9576dc8f6a51d939e93` |

Perbandingan isi dengan cermin PRSI **belum dijalankan** dalam sesi ini. Tunggu worker mengejar perubahan dan data stabil; xmin PRSI tidak bisa disamakan langsung dengan xmin Track. MD5 dan serialisasi berdelimiter tidak memberi bukti matematis kesamaan mutlak; lihat `CONTRACT-RISKS.md`. Format bersama dipertahankan tanpa perubahan sepihak.

## Backup sebelum perubahan

Direktori VPS Track: `/var/backups/prtrack-staging/checksum-20261005-191726` (root-only).

| Berkas | Isi | SHA-256 |
|---|---|---|
| `files.tar.gz` | aplikasi, konfigurasi/secret staging, unit API | `2a772822f035b9c9c15eb2dfef02d783449cd8ad0a5d455463b86c081f27b638` |
| `database.dump` | pg_dump custom DB staging | `7ee4d55492cfab232f0bbf0dcab52848705433990a0a892d1f7fc82df867ea09` |

Arsip lolos `tar -tzf`; dump lolos `pg_restore -l`. Restore ulang belum diuji. Backup berisi token lama yang sudah ditolak dan tidak boleh dibagikan. Saat rollback, pertahankan token baru; jangan mengaktifkan kembali token bocor dari backup.

## Cutover Track production — daftar saja, BELUM dijalankan

1. Dapatkan persetujuan cutover eksplisit; review PR staging dan kontrak PRSI bersama. Jangan merge main sebelum jadwal disetujui karena memicu deploy.
2. Backup production dan uji pemulihan; siapkan migrasi production terpisah. Jangan melemahkan guard atau menjalankan runner `staging/migrate.js` terhadap Neon.
3. Terapkan dependensi sync v2 dan fungsi checksum aditif dengan izin minimum, verifikasi fixture dan kompatibilitas v1/v2 pada target cutover.
4. Siapkan token baca dan monitor production baru serta distribusi kanal secret; pisahkan scope dan uji 401/403. Jangan memakai token staging di production.
5. Tetapkan transport TLS/jaringan privat, bind dan firewall/allowlist production sesuai topologinya; jangan menyalin IP staging tanpa desain. Uji port dari luar.
6. Aktifkan entrypoint/route production yang telah direview; server bisnis saat ini belum mengaktifkan sync. Siapkan rollback kode dan token tanpa menghilangkan outbox.
7. Atur timeout transaksi, alert held, retensi outbox dan pengawasan beban checksum. Koordinasikan snapshot/start/cursor dengan PRSI.
8. Setelah worker mengejar data, rekonsiliasi count, hash versi, content_hash tujuh entitas dan uji mutasi/replay. Monitoring hanya diberi endpoint agregat. Tetap tahan PUT sampai fase tulis disetujui.
