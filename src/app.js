// src/app.js
import Fastify from "fastify";
import dotenv from "dotenv";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";

import authPlugin from "./plugins/auth.js";
import swaggerPlugin from './plugins/swagger.js'; // <-- Import swagger

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

dotenv.config();

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifyCors, {
    origin: ["https://podorukuntrack.com"],
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

  // Global Error Handler untuk format respons standar
  app.setErrorHandler(function (error, request, reply) {
    app.log.error(error);

    // Handle Zod Validation Error (Nantinya)
    if (error.issues) {
      return reply.status(400).send({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    // Default Error
    reply.status(error.statusCode || 500).send({
      success: false,
      message: error.message || "Internal Server Error",
      errors: [],
    });
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  //
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(companyRoutes, { prefix: "/api/v1/companies" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(projectRoutes, { prefix: "/api/v1/projects" });
  await app.register(clusterRoutes, { prefix: "/api/v1/clusters" });
  await app.register(unitRoutes, { prefix: "/api/v1/units" });
  await app.register(progressRoutes, { prefix: "/api/v1/progress" });
  await app.register(documentationRoutes, { prefix: "/api/v1/documentations" });
  await app.register(assignmentRoutes, { prefix: "/api/v1/assignments" });
  // Gunakan prefix root jika di dalam routes sudah ada /units/:id/... agar tidak /api/v1/payments/units/:id
  await app.register(paymentRoutes, { prefix: "/api/v1" });
  await app.register(timelineRoutes, { prefix: "/api/v1/timelines" });
  await app.register(retentionRoutes, { prefix: "/api/v1/retentions" });
  await app.register(handoverRoutes, { prefix: "/api/v1/handovers" });

  await app.register(ticketRoutes, { prefix: "/api/v1/tickets" });
  await app.register(whatsappRoutes, { prefix: "/api/v1/whatsapp" });
  // Dashboard & Analytics gabung
  await app.register(dashboardRoutes, { prefix: "/api/v1" });

  // Welcome Route
  app.get("/", async (request, reply) => {
    return {
      success: true,
      message: "Welcome to PropTrack API v2.0",
      data: {},
    };
  });

  return app;
}
