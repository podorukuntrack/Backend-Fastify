import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";

import authPlugin from "./plugins/auth.js";
import swaggerPlugin from "./plugins/swagger.js";
import redisPlugin from "./plugins/redis.js";

import authRoutes from "./modules/auth/auth.routes.js";
import companyRoutes from "./modules/companies/company.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import projectRoutes from "./modules/projects/project.routes.js";
import clusterRoutes from "./modules/clusters/cluster.routes.js";
import unitRoutes from "./modules/units/unit.routes.js";
import documentationRoutes from "./modules/documentation/documentation.routes.js";
import progressRoutes from "./modules/progress/progress.routes.js";
import assignmentRoutes from "./modules/assignments/assignment.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import timelineRoutes from "./modules/timelines/timeline.routes.js";
import retentionRoutes from "./modules/retentions/retention.routes.js";
import handoverRoutes from "./modules/handovers/handover.routes.js";
import ticketRoutes from "./modules/tickets/ticket.routes.js";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { globalErrorHandler } from "./shared/utils/errorHandler.js";
import { db } from "./config/database.js";
import { sql } from "drizzle-orm";
import { getRedisClient } from "./shared/utils/cache.js";

export async function buildApp() {
  const app = Fastify({
    bodyLimit: 1000 * 1024 * 1024, // 1GB
    logger: process.env.LOG_PRETTY === "true"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
              colorize: true,
            },
          },
        }
      : true,
  });
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
    : [];

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  });

  await app.register(authPlugin);
  await app.register(swaggerPlugin);
  await app.register(redisPlugin);

  app.setErrorHandler(globalErrorHandler);

  await app.register(fastifyMultipart, {
    limits: { fileSize: 5000 * 1024 * 1024 }, // 5GB (praktis tanpa batas)
  });

  // Routes
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(companyRoutes, { prefix: "/api/v1/companies" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(projectRoutes, { prefix: "/api/v1/projects" });
  await app.register(clusterRoutes, { prefix: "/api/v1/clusters" });
  await app.register(unitRoutes, { prefix: "/api/v1/units" });
  await app.register(progressRoutes, { prefix: "/api/v1/progress" });
  await app.register(documentationRoutes, { prefix: "/api/v1/documentations" });
  await app.register(assignmentRoutes, { prefix: "/api/v1/assignments" });
  await app.register(paymentRoutes, { prefix: "/api/v1/payments" });
  await app.register(timelineRoutes, { prefix: "/api/v1/timelines" });
  await app.register(retentionRoutes, { prefix: "/api/v1/retentions" });
  await app.register(handoverRoutes, { prefix: "/api/v1/handovers" });
  await app.register(ticketRoutes, { prefix: "/api/v1/tickets" });
  await app.register(whatsappRoutes, { prefix: "/api/v1/whatsapp" });
  await app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });

  app.get("/", async () => ({
    success: true,
    message: "Welcome to PropTrack API v2.0",
    data: {},
  }));

  app.get("/privacy-policy", async (request, reply) => {
    reply.type("text/html");
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kebijakan Privasi - Podorukun Track</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2 { color: #C41212; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .last-updated { font-style: italic; color: #666; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Kebijakan Privasi</h1>
        <div class="last-updated">Terakhir diperbarui: ${new Date().toLocaleDateString('id-ID')}</div>
        
        <p>Selamat datang di Podorukun Track. Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda saat Anda menggunakan aplikasi seluler Podorukun Track.</p>

        <h2>1. Informasi yang Kami Kumpulkan</h2>
        <p>Untuk memberikan layanan terbaik, kami dapat mengumpulkan informasi berikut:</p>
        <ul>
            <li><strong>Informasi Profil:</strong> Nama, alamat email, dan nomor telepon yang Anda berikan saat mendaftar.</li>
            <li><strong>Data Autentikasi:</strong> Informasi login, termasuk jika Anda menggunakan layanan pihak ketiga seperti <strong>Google Sign-In</strong>.</li>
            <li><strong>Media dan Perangkat:</strong> Akses ke Kamera dan Galeri foto jika Anda mengunggah bukti gambar untuk fitur laporan atau komplain.</li>
            <li><strong>Informasi Perangkat:</strong> Token FCM (Firebase Cloud Messaging) untuk keperluan pengiriman notifikasi (Push Notifications).</li>
        </ul>

        <h2>2. Bagaimana Kami Menggunakan Informasi Anda</h2>
        <p>Kami menggunakan informasi yang dikumpulkan untuk tujuan berikut:</p>
        <ul>
            <li>Memverifikasi identitas dan memberikan akses ke akun Anda.</li>
            <li>Memantau dan melaporkan progres pembangunan atau serah terima unit secara real-time.</li>
            <li>Mengirimkan pemberitahuan penting (notifikasi) terkait proyek Anda.</li>
            <li>Menyediakan layanan pelanggan dan menanggapi keluhan atau pertanyaan Anda.</li>
        </ul>

        <h2>3. Pihak Ketiga</h2>
        <p>Aplikasi Podorukun Track menggunakan layanan pihak ketiga yang mungkin mengumpulkan informasi yang digunakan untuk mengidentifikasi Anda. Layanan pihak ketiga yang kami gunakan meliputi:</p>
        <ul>
            <li><strong>Google Play Services & Google Sign-In</strong> (untuk keperluan autentikasi yang aman)</li>
            <li><strong>Google Analytics for Firebase & Firebase Crashlytics</strong> (untuk analisis performa aplikasi dan pelaporan kerusakan)</li>
            <li><strong>Firebase Cloud Messaging</strong> (untuk pengiriman notifikasi)</li>
        </ul>

        <h2>4. Keamanan Data</h2>
        <p>Kami sangat memprioritaskan keamanan data Anda. Kata sandi dienkripsi, dan pertukaran data antara aplikasi dan server dilindungi menggunakan protokol keamanan standar industri (HTTPS/SSL). Meskipun demikian, perlu diingat bahwa tidak ada metode transmisi data melalui internet yang 100% aman.</p>

        <h2>5. Hak Pengguna</h2>
        <p>Anda memiliki hak untuk meminta akses, pembaruan, atau penghapusan data pribadi Anda kapan saja. Jika Anda ingin menghapus akun dan semua data yang terkait, Anda dapat menghubungi kami melalui layanan dukungan yang tertera atau fitur hapus akun (jika tersedia dalam aplikasi).</p>

        <h2>6. Perubahan Kebijakan Privasi</h2>
        <p>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Setiap perubahan akan diberitahukan melalui aplikasi atau halaman ini.</p>

        <h2>7. Hubungi Kami</h2>
        <p>Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami di podorukuntrack@gmail.com.</p>
    </div>
</body>
</html>`;
  });

  // ── Health Check ─────────────────────────────────────────────
  app.get("/health", async (_request, reply) => {
    const checks = {
      server: "ok",
      database: "unknown",
      redis: "unknown",
    };

    let isHealthy = true;

    // Cek Database
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch (err) {
      checks.database = "error";
      isHealthy = false;
    }

    // Cek Redis
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        checks.redis = "ok";
      } else {
        checks.redis = "not_connected";
        isHealthy = false;
      }
    } catch (err) {
      checks.redis = "error";
      isHealthy = false;
    }

    const statusCode = isHealthy ? 200 : 503;
    return reply.code(statusCode).send({
      success: isHealthy,
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  return app;
}