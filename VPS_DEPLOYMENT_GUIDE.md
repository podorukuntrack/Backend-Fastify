# 🚀 VPS Deployment Guide — PodoRukunTrack Backend

Panduan ini menjelaskan cara menyiapkan dan menjalankan **backend Fastify**, **Redis**, **Uptime Kuma**, serta konfigurasi **auto-deploy via GitHub Actions** di sebuah VPS (Ubuntu 22.04 LTS).

---

## 📋 Prasyarat VPS

Sebelum memulai, pastikan VPS Anda memenuhi spesifikasi berikut:

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 1 GB | 2 GB |
| **Storage** | 20 GB SSD | 40 GB SSD |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 🛠️ Tahap 1: Setup Awal VPS

Hubungkan ke VPS Anda melalui terminal:

```bash
ssh root@IP_VPS_ANDA
# atau
ssh user@IP_VPS_ANDA
```

### 1.1 Update Sistem

```bash
apt update && apt upgrade -y
```

### 1.2 Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # Harusnya: v20.x.x
npm -v
```

### 1.3 Install PM2 (Process Manager)

PM2 menjaga aplikasi Node.js tetap berjalan di background dan otomatis bangkit saat VPS reboot.

```bash
npm install -g pm2
pm2 -v  # Verifikasi instalasi
```

### 1.4 Install Docker & Docker Compose

Docker digunakan untuk menjalankan **Redis** dan **Uptime Kuma**.

```bash
# Install Docker
curl -fsSL https://get.docker.com | bash

# Verifikasi
docker -v        # Docker version 24.x.x
docker compose version  # Docker Compose version 2.x.x

# Izinkan user non-root menjalankan Docker (opsional)
usermod -aG docker $USER
```

### 1.5 Install Nginx (Reverse Proxy)

Nginx akan menjadi gerbang utama yang meneruskan permintaan dari port 80/443 ke aplikasi Fastify Anda di port 3000.

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

## 📁 Tahap 2: Clone Repositori

```bash
# Buat direktori project
mkdir -p /var/www
cd /var/www

# Clone repository dari GitHub
git clone https://github.com/USERNAME/Backend-Fastify.git

# Masuk ke folder project
cd Backend-Fastify
```

---

## ⚙️ Tahap 3: Konfigurasi Environment Variables

Ini adalah langkah **paling penting**. Buat file `.env` dari template yang telah disediakan:

```bash
# Salin template .env.example
cp .env.example .env

# Edit file .env dengan editor nano
nano .env
```

Isi file `.env` dengan nilai yang sesuai untuk *production*:

```env
# ==========================================
# KONFIGURASI PRODUCTION
# ==========================================

NODE_ENV=production
PORT=3000

# Ganti dengan domain frontend Anda yang sebenarnya
FRONTEND_URL=https://podorukuntrack.pages.dev,https://podorukuntrack.com

# Database PostgreSQL (GANTI dengan kredensial database prod Anda!)
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME

# Redis (biarkan jika menggunakan Docker Compose di VPS yang sama)
REDIS_URL=redis://localhost:6379

# JWT Secret — WAJIB DIGANTI dengan string panjang & acak!
# Generate dengan: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=GANTI_DENGAN_STRING_RAHASIA_PANJANG_DAN_ACAK_DI_SINI

# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# WhatsApp API
WHATSAPP_API_URL=
WHATSAPP_TOKEN=
```

> [!CAUTION]
> **JANGAN pernah commit file `.env` ke GitHub.** File ini sudah terdaftar di `.gitignore`. Simpan kredensial ini di tempat yang aman.

Simpan file dengan menekan `Ctrl+X` → `Y` → `Enter`.

---

## 🐳 Tahap 4: Jalankan Docker Compose (Redis + Uptime Kuma)

File `docker-compose.prod.yml` sudah menyediakan konfigurasi untuk Redis dan Uptime Kuma.

```bash
# Dari folder /var/www/Backend-Fastify
docker compose -f docker-compose.prod.yml up -d

# Cek status container
docker compose -f docker-compose.prod.yml ps
```

Output yang diharapkan:
```
NAME                           STATUS
podorukuntrack_redis_prod      Up (healthy)
podorukuntrack_uptime_kuma     Up
```

---

## 📦 Tahap 5: Install Dependencies & Jalankan Backend

```bash
# Install npm packages
npm install --omit=dev

# Jalankan backend menggunakan PM2
pm2 start src/server.js --name "podorukuntrack-api" --interpreter node

# Cek status
pm2 status
pm2 logs podorukuntrack-api

# Simpan konfigurasi PM2 agar otomatis berjalan saat VPS restart
pm2 save
pm2 startup  # Ikuti instruksi yang muncul dari perintah ini
```

Verifikasi backend berjalan:
```bash
curl http://localhost:3000/health
```

Respons yang diharapkan:
```json
{
  "success": true,
  "status": "healthy",
  "checks": { "server": "ok", "database": "ok", "redis": "ok" }
}
```

---

## 🌐 Tahap 6: Konfigurasi Nginx (Reverse Proxy)

Buat file konfigurasi Nginx untuk domain API Anda:

```bash
nano /etc/nginx/sites-available/podorukuntrack-api
```

Tempelkan konfigurasi berikut (ganti `api.podorukuntrack.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name api.podorukuntrack.com;

    # Teruskan semua request ke Fastify di port 3000
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:

```bash
ln -s /etc/nginx/sites-available/podorukuntrack-api /etc/nginx/sites-enabled/
nginx -t           # Uji konfigurasi
systemctl reload nginx
```

### 6.1 Aktifkan HTTPS dengan Certbot (SSL Gratis)

```bash
apt install -y certbot python3-certbot-nginx

# Dapatkan sertifikat SSL untuk domain Anda
certbot --nginx -d api.podorukuntrack.com

# Ikuti instruksi yang muncul
# Certbot akan otomatis mengubah konfigurasi Nginx Anda
```

Certbot akan memperbarui sertifikat SSL secara otomatis melalui *cron job*.

---

## 🤖 Tahap 7: Setup GitHub Actions (Auto-Deploy)

Setiap kali Anda *push* kode ke `main`, GitHub Actions akan secara otomatis men-*deploy* ke VPS.

### 7.1 Buat SSH Key untuk GitHub Actions

Di VPS, jalankan:

```bash
# Buat SSH key pair khusus untuk deploy
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""

# Tambahkan public key ke authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Tampilkan private key (copy ini!)
cat ~/.ssh/github_actions_key
```

### 7.2 Tambahkan Secrets ke GitHub Repository

Buka repositori GitHub Anda → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Tambahkan 3 secrets berikut:

| Nama Secret | Nilai |
|---|---|
| `VPS_HOST` | IP address VPS Anda (contoh: `123.456.789.0`) |
| `VPS_USER` | Username SSH (contoh: `root` atau `ubuntu`) |
| `VPS_SSH_KEY` | Isi dari private key (`~/.ssh/github_actions_key`) |

### 7.3 Verifikasi Workflow GitHub Actions

File `.github/workflows/deploy.yml` yang sudah ada akan menjalankan perintah berikut setiap *push* ke `main`:

```bash
cd /var/www/Backend-Fastify
git pull origin main
npm install
pm2 restart podorukuntrack-api
```

---

## 📡 Tahap 8: Setup Uptime Kuma (Monitoring)

Uptime Kuma sudah berjalan di port `3001` melalui Docker Compose.

### 8.1 Akses Dashboard

Buka browser dan kunjungi:
```
http://IP_VPS_ANDA:3001
```

> [!NOTE]
> Saat pertama kali membuka, Anda akan diminta untuk membuat **akun admin**. Lakukan ini segera dan simpan kredensialnya.

### 8.2 Tambahkan Monitor

Setelah login, klik **"Add New Monitor"** dan tambahkan:

**Monitor 1: Backend API Health**
- **Monitor Type**: HTTP(s)
- **Friendly Name**: Backend API
- **URL**: `https://api.podorukuntrack.com/health`
- **Heartbeat Interval**: 60 detik
- **Expected Status Codes**: `200`

**Monitor 2: Frontend (Cloudflare Pages)**
- **Monitor Type**: HTTP(s)
- **Friendly Name**: Frontend App
- **URL**: `https://podorukuntrack.pages.dev`
- **Heartbeat Interval**: 120 detik

**Monitor 3: Redis (Port Check)**
- **Monitor Type**: TCP Port
- **Friendly Name**: Redis
- **Hostname**: `localhost`
- **Port**: `6379`

### 8.3 Setup Notifikasi

Klik **"Settings"** → **"Notifications"** → **"Setup Notification"**

Pilih salah satu kanal:
- **Telegram** (Direkomendasikan): Masukkan Bot Token & Chat ID
- **Email (SMTP)**: Masukkan kredensial email
- **WhatsApp (via Webhook)**: Masukkan Webhook URL

---

## 🔁 Perintah Operasional Sehari-hari

### Backend (PM2)

```bash
# Lihat status semua proses
pm2 status

# Lihat log real-time
pm2 logs podorukuntrack-api

# Restart aplikasi
pm2 restart podorukuntrack-api

# Stop aplikasi
pm2 stop podorukuntrack-api
```

### Docker (Redis + Uptime Kuma)

```bash
cd /var/www/Backend-Fastify

# Lihat status container
docker compose -f docker-compose.prod.yml ps

# Lihat log Redis
docker compose -f docker-compose.prod.yml logs redis

# Restart semua container
docker compose -f docker-compose.prod.yml restart

# Stop semua container
docker compose -f docker-compose.prod.yml down
```

### Nginx

```bash
# Reload konfigurasi (tanpa downtime)
systemctl reload nginx

# Cek status
systemctl status nginx
```

---

## 🆘 Troubleshooting

### Backend tidak bisa start

```bash
# Cek log error
pm2 logs podorukuntrack-api --err

# Penyebab umum:
# 1. File .env tidak ada atau tidak lengkap
# 2. DATABASE_URL salah (koneksi database gagal)
# 3. PORT yang digunakan sudah dipakai proses lain
```

### Redis tidak terkoneksi

```bash
# Cek apakah container Redis berjalan
docker ps | grep redis

# Cek log Redis
docker logs podorukuntrack_redis_prod

# Test koneksi Redis manual
docker exec -it podorukuntrack_redis_prod redis-cli ping
# Output: PONG (artinya Redis normal)
```

### Endpoint `/health` mengembalikan status `degraded`

Akses `https://api.podorukuntrack.com/health` dan periksa field `checks`:
- `database: "error"` → Periksa `DATABASE_URL` di file `.env`
- `redis: "not_connected"` → Pastikan container Redis berjalan (`docker ps`)

### GitHub Actions gagal deploy

- Pastikan ketiga secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) sudah benar di pengaturan GitHub repository.
- Pastikan direktori `/var/www/Backend-Fastify` sudah ada di VPS dan milik user SSH yang digunakan.

---

## ✅ Deployment Checklist

Gunakan checklist ini setiap kali melakukan *deployment* perdana atau migrasi server:

- [ ] Node.js 20+ terinstall
- [ ] PM2 terinstall secara global
- [ ] Docker & Docker Compose terinstall
- [ ] Nginx terinstall dan berjalan
- [ ] File `.env` dibuat dari `.env.example` dan diisi lengkap
- [ ] `JWT_SECRET` sudah diganti dengan nilai acak yang aman
- [ ] Docker Compose (`docker-compose.prod.yml`) dijalankan → Redis & Uptime Kuma aktif
- [ ] `npm install` berhasil
- [ ] Backend dijalankan via PM2 dan statusnya `online`
- [ ] `GET /health` mengembalikan `status: "healthy"`
- [ ] Konfigurasi Nginx sudah benar dan aktif
- [ ] Sertifikat SSL (HTTPS) sudah aktif via Certbot
- [ ] Secrets GitHub Actions sudah diisi (VPS_HOST, VPS_USER, VPS_SSH_KEY)
- [ ] Uptime Kuma monitor sudah ditambahkan untuk semua layanan
- [ ] Notifikasi Uptime Kuma sudah dikonfigurasi

---

*Terakhir diperbarui: Mei 2026 | Versi: 2.0*
