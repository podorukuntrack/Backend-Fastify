import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";

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
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import bannersRoutes from "./modules/banners/banners.routes.js";
import utilsRoutes from "./modules/utils/utils.routes.js";
import { globalErrorHandler } from "./shared/utils/errorHandler.js";
import { db } from "./config/database.js";
import { sql } from "drizzle-orm";
import { getRedisClient } from "./shared/utils/cache.js";

export async function buildApp() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = Fastify({
    bodyLimit: 10 * 1024 * 1024, // 10MB — cukup untuk JSON besar, file upload dibatasi terpisah oleh multipart plugin
    trustProxy: true, // Percaya pada header X-Forwarded-For dari Nginx / Cloudflare
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          ignore: "pid,hostname,time",
          colorize: true,
          singleLine: false,
        },
      },
    },
  });
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
    : ["http://localhost:5173", "http://localhost:3000"];

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return cb(null, true);
      // Di production, hanya izinkan origin yang eksplisit dari FRONTEND_URL
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      // Di development, izinkan localhost dan ngrok untuk testing
      if (!isProduction && (origin.startsWith("http://localhost:") || origin.endsWith(".ngrok-free.app") || origin.endsWith(".ngrok.io"))) {
        return cb(null, true);
      }
      const err = new Error("Not allowed by CORS");
      err.statusCode = 403;
      return cb(err, false);
    },
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



  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || "my-secret",
    hook: 'onRequest',
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io", "https://fastify.io"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: ["'self'"],
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'sameorigin'
    },
    noSniff: true
  });

  await app.register(authPlugin);
  // Swagger UI hanya aktif di development — mencegah recon di production
  if (!isProduction) {
    await app.register(swaggerPlugin);
  }
  await app.register(redisPlugin);

  await app.register(fastifyRateLimit, {
    max: async (request, key) => {
      let role = 'guest';
      const token = request.cookies?.accessToken || (request.headers.authorization ? request.headers.authorization.replace('Bearer ', '') : null);
      if (token && request.server.jwt) {
        try {
          // Gunakan jwt.verify() bukan jwt.decode() — mencegah bypass rate limit dengan JWT palsu
          const decoded = request.server.jwt.verify(token);
          if (decoded && decoded.role) role = decoded.role;
        } catch (e) {
          // Token tidak valid — tetap gunakan role 'guest'
        }
      }
      
      if (['super_admin', 'owner', 'direksi', 'admin'].includes(role)) {
        return 10000; // practically unlimited for executives and admins
      }
      return 500; // 500 req/minute for normal users/customers
    },
    timeWindow: '1 minute',
    redis: getRedisClient(),
  });

  app.setErrorHandler(globalErrorHandler);

  await app.register(fastifyMultipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (Lebih aman, mencegah DDoS/OOM namun cukup untuk foto besar)
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
  await app.register(whatsappRoutes, { prefix: "/api/v1/whatsapp" });
  await app.register(dashboardRoutes, { prefix: "/api/v1/dashboard" });
  await app.register(bannersRoutes, { prefix: "/api/v1/banners" });
  await app.register(utilsRoutes, { prefix: "/api/v1/utils" });

  app.get("/", async (_request, reply) => {
    return reply.code(404).type("text/plain").send("");
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

  // ── WhatsApp Health Check (Khusus untuk Uptime Kuma) ──
  app.get("/health/whatsapp", async (_request, reply) => {
    try {
      // Ping ke Microservice OpenWA Docker
      const response = await fetch("http://localhost:2785/api/docs");
      const isConnected = response.ok;
      
      return reply.code(isConnected ? 200 : 503).send({
        success: isConnected,
        status: isConnected ? 'ok' : 'error',
        message: isConnected ? 'OpenWA Microservice is running' : 'OpenWA Microservice is unreachable',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return reply.code(503).send({ 
        success: false, 
        status: 'error', 
        message: err.message 
      });
    }
  });

  return app;
}
