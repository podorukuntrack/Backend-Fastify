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

| Keperluan | Mode koneksi | Dipakai oleh |
|---|---|---|
| Runtime aplikasi | Transaction pooler | `DATABASE_URL` |
| Migrasi & restore | Session pooler | `MIGRATION_DATABASE_URL`, `pg_restore` |
| Backup harian | Session pooler | Secret `BACKUP_DATABASE_URL` di GitHub |

Password yang mengandung `@ : / ? #` wajib di-URL-encode. Sertakan
`?sslmode=require` bila penyedia mewajibkan TLS.

### 0.2 Catat versi PostgreSQL server baru

```bash
psql "<SESSION_POOLER_URL>" -Atc "SHOW server_version"
```

Angka mayornya dipakai di dua tempat: tag image pada perintah `pg_dump` di
bawah, dan repository variable `PG_MAJOR` di GitHub Actions. Bila versi server
baru **lebih rendah** dari server lama, hentikan prosedur dan minta versi yang
sama ke penyedia — dump dari versi lebih baru dapat memuat sintaks yang tidak
dikenali versi lama.

Versi juga harus 13 ke atas. Di bawah itu, `gen_random_uuid()` yang menjadi
DEFAULT hampir semua primary key tidak tersedia.

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
  pg_dump "$OLD_URL" -Fc -O -x -f /out/pre-migration.dump
```

Ganti `postgres:18` bila versi server lama berbeda. Flag `-Fc` menghasilkan
format custom (dapat di-`pg_restore` sebagian), `-O` membuang kepemilikan objek,
`-x` membuang GRANT — dua hal terakhir wajib karena penyedia terkelola tidak
memberi peran superuser.

Periksa hasilnya tidak kosong:

```bash
ls -lh pre-migration.dump
```

File di bawah 50 KB berarti dump gagal. Jangan lanjut.

Simpan salinannya di luar VPS sebelum menyentuh apa pun:

```bash
aws s3 cp pre-migration.dump s3://$R2_BUCKET_NAME/database-backups/pre-migration.dump \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

### 1.3 Restore ke database baru

```bash
docker run --rm -e NEW_URL="<SESSION_POOLER_URL>" -v "$PWD:/in" postgres:18 \
  pg_restore -d "$NEW_URL" --no-owner --no-acl /in/pre-migration.dump
```

Gunakan **session pooler**, bukan transaction pooler — `pg_restore` menjaga
state sesi sepanjang proses.

Dump penuh ini sudah membawa skema, data, indeks, constraint, dan tabel
pencatat migrasi Drizzle sekaligus. **Jangan jalankan `drizzle-kit migrate`
setelahnya** — Drizzle akan membaca tabel pencatat yang ikut ter-restore dan
mengetahui keempat migrasi di folder `drizzle/` sudah teraplikasi.

Beberapa peringatan `WARNING: errors ignored on restore` yang menyebut
`EXTENSION` atau kepemilikan objek adalah hal normal di penyedia terkelola dan
boleh diabaikan. Yang tidak boleh diabaikan: pesan yang menyebut `relation` atau
`constraint` gagal dibuat.

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
# Runtime — transaction pooler
DATABASE_URL=postgres://user:password@host:6543/dbname?sslmode=require

# drizzle-kit dan pg_dump/pg_restore — session pooler
MIGRATION_DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require

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

---

## Bagian 3 — Pasca-migrasi

### 3.1 Alihkan backup harian

Di GitHub repo → Settings → Secrets and variables → Actions:

1. Buat secret baru `BACKUP_DATABASE_URL` berisi session pooler URL.
2. Buat repository variable `PG_MAJOR` bila versi server baru bukan 18.
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
