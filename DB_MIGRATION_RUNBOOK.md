# Runbook Migrasi Database

Prosedur pemindahan database PostgreSQL ke penyedia baru, dijalankan di VPS
dalam satu jendela pemeliharaan. Server dimatikan selama proses berlangsung
sehingga tidak ada tulisan baru yang masuk ke database lama setelah dump
diambil.

Estimasi waktu henti: 15–30 menit untuk database berukuran ~10 MB.

**Aturan utama: database lama tidak disentuh sama sekali.** Seluruh prosedur
ini hanya membaca darinya. Selama database lama masih utuh, setiap langkah
bisa dibatalkan dengan mengembalikan satu baris di `.env`.

---

## Bagian 0 — Persiapan (tanpa waktu henti)

Kerjakan seluruh bagian ini sebelum mematikan server. Tidak ada satu pun
langkah di sini yang mengganggu pengguna.

### 0.1 Kumpulkan tiga connection string dari dashboard penyedia baru

| Keperluan | Mode koneksi | Port di Sumopod | Dipakai oleh |
|---|---|---|---|
| Runtime aplikasi | Transaction pooler | 6432 | `DATABASE_URL` |
| Migrasi & restore | Session pooler | 6433 | `MIGRATION_DATABASE_URL`, `psql` |
| Backup harian | Session pooler | 6433 | Secret `BACKUP_DATABASE_URL` di GitHub |

Nomor port berbeda antar penyedia. Periksa dashboard, jangan menyalin dari
tabel di atas bila penyedianya berganti lagi.

Password yang mengandung `@ : / ? #` wajib di-URL-encode.

Sertakan `?sslmode=require` **hanya** bila penyedia benar-benar melayani TLS.
Bila tidak, sambungan gagal dengan pesan yang menyesatkan — `SSL routines:
tls_validate_record_header:wrong version number`, yang sebenarnya berarti server
menjawab handshake TLS dengan protokol polos. Uji dulu:

```bash
psql "<URL>?sslmode=require" -Atc "SELECT 1"   # berhasil? pakai sslmode=require
psql "<URL>" -Atc "SELECT 1"                   # hanya ini yang berhasil? jangan pakai
```

Kedua penyedia bisa berbeda sikap, dan seringkali memang berbeda: satu menolak
sambungan polos, satunya lagi tidak melayani TLS sama sekali. Uji masing-masing
secara terpisah — jangan menyalin `sslmode` dari URL lama ke URL baru.

> **Peringatan keamanan.** Tanpa TLS, password autentikasi dan seluruh isi
> tabel melintasi jaringan tanpa enkripsi. Hal ini dapat diterima bila VPS dan
> database berada pada jaringan privat yang sama. Bila lalu lintasnya melewati
> internet publik, mintalah endpoint TLS ke penyedia sebelum melanjutkan.

### 0.2 Catat versi PostgreSQL kedua server

```bash
psql "<URL_DATABASE_LAMA>"   -Atc "SHOW server_version"
psql "<SESSION_POOLER_URL>"  -Atc "SHOW server_version"
```

Versi server tujuan harus 13 ke atas. Di bawah itu, `gen_random_uuid()` yang
menjadi DEFAULT hampir semua primary key tidak tersedia dan setiap INSERT gagal.

Selanjutnya bandingkan keduanya, karena inilah yang menentukan bentuk perintah
di langkah 1.2 dan 1.3:

- **Versi tujuan sama atau lebih baru.** Pakai dump format custom: ganti
  `--format=plain` menjadi `-Fc` di langkah 1.2, dan `psql` menjadi
  `pg_restore -d "$NEW_URL" --no-owner --no-acl` di langkah 1.3. Format custom
  lebih tahan banting karena `pg_restore` mengatur sendiri urutan pembuatan
  objek.
- **Versi tujuan lebih tua.** Ikuti perintah di bawah apa adanya. Format custom
  tidak bisa dipakai: `pg_restore` versi lama menolak arsip yang dibuat
  `pg_dump` versi baru karena nomor format arsipnya tidak dikenali. SQL polos
  tidak punya batasan itu, dengan satu penyesuaian yang dijelaskan di 1.3.

Turun versi mayor tidak dijamin mulus. Yang membuatnya layak ditempuh adalah
langkah 1.4: bila ada yang tidak ikut berpindah, checksum per tabel
menangkapnya sebelum `DATABASE_URL` dialihkan.

### 0.3 Uji sambungan dari VPS

```bash
psql "<TRANSACTION_POOLER_URL>" -Atc "SELECT 1"
```

Gagal di sini berarti masalah jaringan (firewall keluar, IP allowlist di sisi
penyedia, atau database hanya menerima IPv6). Selesaikan sekarang, bukan saat
server sudah mati.

---

## Bagian 1 — Jendela pemeliharaan dimulai

### 1.1 Matikan server

```bash
pm2 stop podorukuntrack-api
```

Ini menghentikan seluruh instance cluster sekaligus. Karena cron dijadwalkan
di dalam proses (`src/server.js:15`), penjadwal ikut berhenti — tidak ada
reminder KPR atau job handover yang menulis ke database di tengah migrasi.

Redis dan WAHA sengaja dibiarkan hidup. Job notifikasi yang masuk antrean
selama server mati akan diproses BullMQ begitu server kembali menyala.

Pastikan benar-benar berhenti sebelum lanjut:

```bash
pm2 list
```

Status `podorukuntrack-api` harus `stopped`. Bila masih `online`, jangan
teruskan — proses yang masih hidup akan terus menulis ke database lama setelah
dump diambil, dan tulisan itu akan hilang.

### 1.2 Ambil dump terakhir

```bash
docker run --rm -e OLD_URL="<URL_DATABASE_LAMA>" -v "$PWD:/out" postgres:18 \
  pg_dump "$OLD_URL" --format=plain -O -x -f /out/pre-migration.sql
```

Tag image **wajib sama dengan versi server lama**, bukan versi server baru.
`pg_dump` yang lebih tua dari server yang di-dump tidak didukung.

`-O` membuang kepemilikan objek dan `-x` membuang GRANT; keduanya wajib karena
penyedia terkelola tidak memberi peran superuser.

Periksa hasilnya tidak kosong:

```bash
ls -lh pre-migration.sql
head -n 5 pre-migration.sql
```

Baris pertama harus memuat `-- PostgreSQL database dump`. Berkas di bawah 100 KB
berarti dump gagal. Jangan lanjut.

Simpan salinannya di luar VPS sebelum menyentuh apa pun:

```bash
gzip -c pre-migration.sql > pre-migration.sql.gz
aws s3 cp pre-migration.sql.gz s3://$R2_BUCKET_NAME/database-backups/pre-migration.sql.gz \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

### 1.3 Restore ke database baru

**Hanya bila versi tujuan lebih tua:** buang pengaturan yang belum dikenal
server lama.

```bash
sed -i -E "/^SET (transaction_timeout|default_toast_compression) = /d" pre-migration.sql
```

`pg_dump` versi 17 ke atas menuliskan `SET transaction_timeout = 0;` di bagian
awal berkas. Parameter itu baru ada sejak PostgreSQL 17, sehingga server 16
menolaknya dengan `unrecognized configuration parameter` dan — karena
`ON_ERROR_STOP` di bawah — restore berhenti di baris pertama.

Pastikan hasilnya bersih sebelum lanjut:

```bash
grep -c "^SET transaction_timeout" pre-migration.sql   # harus 0
```

Sekarang jalankan restore:

```bash
docker run --rm -e NEW_URL="<SESSION_POOLER_URL>" -v "$PWD:/in" postgres:16 \
  psql "$NEW_URL" -v ON_ERROR_STOP=1 -f /in/pre-migration.sql
```

Dua hal yang menentukan di sini:

- **Session pooler, bukan transaction pooler.** `psql` menjaga state sesi
  sepanjang berkas dijalankan.
- **`ON_ERROR_STOP=1` wajib.** Tanpa itu `psql` melewati pernyataan yang gagal
  dan tetap keluar dengan kode 0 — restore setengah jadi yang tampak berhasil.

Tag image di sini mengikuti versi server **baru**, karena `psql` di sini
bertindak sebagai klien terhadapnya.

Dump penuh ini sudah membawa skema, data, indeks, constraint, dan tabel
pencatat migrasi Drizzle sekaligus. **Jangan jalankan `drizzle-kit migrate`
setelahnya** — Drizzle akan membaca tabel pencatat yang ikut ter-restore dan
mengetahui keempat migrasi di folder `drizzle/` sudah teraplikasi.

Bila restore berhenti di tengah, database tujuan tinggal dikosongkan lalu
diulang — tidak ada yang perlu dipulihkan, karena database lama tidak tersentuh:

```bash
docker run --rm -e NEW_URL="<SESSION_POOLER_URL>" postgres:16 \
  psql "$NEW_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### 1.4 Buktikan datanya identik

```bash
SOURCE_DATABASE_URL="<URL_DATABASE_LAMA>" \
TARGET_DATABASE_URL="<SESSION_POOLER_URL>" \
npm run verify:db
```

Skrip ini membandingkan versi server dan latensi, daftar tabel, definisi tiap
kolom, jumlah baris per tabel, checksum md5 isi tiap tabel, dan nilai akhir tiap
sequence. Checksum dihitung dari representasi teks tiap baris yang diurutkan
menurut isinya sendiri, sehingga urutan fisik baris yang selalu berubah setelah
restore tidak memengaruhi hasil.

**Lanjut hanya bila keluarannya `🎉 Kedua database identik`.** Selain itu,
perbaiki dulu penyebabnya lalu jalankan ulang. Skrip keluar dengan kode 1 bila
ada perbedaan, jadi aman dipakai di dalam skrip lain.

### 1.5 Alihkan konfigurasi

Sunting `.env` di VPS:

```bash
# Runtime — transaction pooler.
# Tambahkan ?sslmode=require hanya bila langkah 0.1 membuktikan penyedia
# melayani TLS. Bila tidak, sambungan justru gagal.
DATABASE_URL=postgres://user:password@host:6432/dbname

# drizzle-kit dan pg_dump/psql — session pooler
MIGRATION_DATABASE_URL=postgres://user:password@host:6433/dbname

# Total koneksi = nilai ini × jumlah instance PM2 (satu per vCPU).
# Di 2 vCPU: 2 × 10 = 20 dari kuota 50.
DB_POOL_MAX=10
```

Simpan nilai `DATABASE_URL` yang lama sebagai komentar di baris atasnya. Itulah
jalur pembatalan tercepat bila terjadi sesuatu.

### 1.6 Nyalakan server

```bash
pm2 restart podorukuntrack-api --update-env
```

`--update-env` wajib. Tanpa flag itu PM2 memakai ulang environment lama dan
proses tetap tersambung ke database lama — gejalanya membingungkan, karena
aplikasi berjalan normal tetapi menulis ke tempat yang salah.

---

## Bagian 2 — Verifikasi setelah menyala

### 2.1 Health check

```bash
curl -s localhost:3000/health
```

Harus mengembalikan HTTP 200 dengan `database: "ok"`.

### 2.2 Pastikan tersambung ke database yang benar

```bash
pm2 logs podorukuntrack-api --lines 40 --nostream
```

Cari baris `✅ Database connected successfully` beserta waktu server yang
dicetak `testDatabaseConnection()`.

### 2.3 Periksa jumlah koneksi di dashboard penyedia

Angka Active Connections harus naik dari 0 ke sekitar jumlah instance PM2 —
bukan ke kelipatan `DB_POOL_MAX`. Pool `postgres.js` membuka koneksi sesuai
kebutuhan, tidak langsung penuh di awal. Bila angkanya mendekati kuota saat
trafik normal, turunkan `DB_POOL_MAX` lalu `pm2 restart --update-env`.

### 2.4 Uji jalur tulis lewat aplikasi

Lakukan satu operasi tulis nyata dari frontend — misal menambah catatan
progress. Ini yang membuktikan transaksi berjalan lewat transaction pooler,
sesuatu yang tidak tercakup oleh health check yang hanya membaca.

Perilaku pooler pada port 6432 sudah diuji terpisah sebelum migrasi:
`txid_current()` bernilai sama di awal dan akhir blok transaksi, artinya satu
koneksi server dipegang dari `BEGIN` sampai `COMMIT`. Kedelapan pemanggilan
`db.transaction()` di repository karena itu aman. Langkah ini memastikan
perilaku yang sama muncul lewat jalur aplikasi yang sebenarnya.

---

## Bagian 3 — Pasca-migrasi

### 3.1 Alihkan backup harian

Di GitHub repo → Settings → Secrets and variables → Actions:

1. Buat secret baru `BACKUP_DATABASE_URL` berisi session pooler URL.
2. Setel repository variable `PG_MAJOR` ke versi mayor server **baru**. Salah
   di sini berakibat fatal secara diam-diam: `pg_dump` yang lebih tua dari
   server akan menolak jalan, sedangkan yang lebih baru menghasilkan berkas yang
   tidak dapat dipulihkan kembali ke server itu sendiri.
3. Hapus secret lama `NEON_DATABASE_URL` **setelah** langkah berikutnya lulus.

Jalankan `Database Daily Backup` secara manual lewat tombol Run workflow, lalu
pastikan hijau dan file barunya muncul di R2 pada prefix `database-backups/`.

Workflow sekarang berhenti dengan error bila dump kosong. Sebelumnya tidak:
`pg_dump` yang gagal tetap menghasilkan file `.gz` dan job berwarna hijau,
sehingga backup mati bisa berjalan berhari-hari tanpa ketahuan.

Backup lama tetap berada di prefix `neon-backups/` pada bucket yang sama.
Jangan dihapus — itu satu-satunya salinan data periode sebelum migrasi.

### 3.2 Jangan hapus database lama

Biarkan hidup minimal 7 hari setelah migrasi. Biayanya jauh lebih murah
daripada kehilangan data. Hapus hanya setelah backup harian dari database baru
terbukti hijau beberapa hari berturut-turut.

---

## Pembatalan

Bila ada masalah setelah peralihan, pada tahap mana pun:

```bash
pm2 stop podorukuntrack-api
# kembalikan DATABASE_URL di .env ke nilai lama (tersimpan sebagai komentar
# pada langkah 1.5), dan hapus baris MIGRATION_DATABASE_URL
pm2 restart podorukuntrack-api --update-env
curl -s localhost:3000/health
```

Prosedur ini aman selama database lama belum dihapus dan belum menerima
tulisan baru. Tulisan yang masuk ke database baru sejak peralihan akan hilang
saat kembali ke database lama — karena itu langkah 2.4 sebaiknya dilakukan
segera, bukan berjam-jam kemudian.

---

## Yang tidak perlu diubah

- **Frontend.** Berkomunikasi lewat HTTP API, tidak pernah menyentuh database
  langsung.
- **Redis, BullMQ, WAHA.** Tidak bergantung pada penyedia database.
- **Berkas migrasi di `drizzle/`.** Keempatnya ikut ter-restore lewat dump.
- **Kode kueri aplikasi.** Kedelapan pemanggilan `db.transaction()` berjalan
  normal di transaction pooler; satu transaksi dipegang oleh satu koneksi server
  dari awal sampai commit.
