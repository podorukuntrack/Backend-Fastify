// src/modules/dashboard/dashboard.routes.js
import { authorize } from "../../middleware/authorize.js";
import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";
import { removeExamples } from "../../plugins/swagger.js";

export default async function dashboardRoutes(fastify, options) {
  fastify.addHook("preValidation", fastify.authenticate);

  /**
   * Reusable success response schema
   */
  const successSchema = (dataProperties) =>
    removeExamples({
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
        data: {
          type: "object",
          properties: dataProperties,
        },
      },
    });

  // =========================================================
  // DASHBOARD STATS USED BY FRONTEND
  // =========================================================
  fastify.get(
    "/stats",
    {
      schema: removeExamples({
        description: "Mendapatkan statistik dashboard utama untuk frontend.",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
      }),
      preHandler: authorize("super_admin", "admin"),
    },
    async (request, reply) => {
      const cid = request.user.companyId ?? null;

      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)) AS projects_total,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND p.status = 'active') AS projects_active,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND p.status = 'completed') AS projects_completed,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND p.status = 'on_hold') AS projects_on_hold,

          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)) AS units_total,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND u.status_pembangunan = 'selesai') AS units_selesai,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND u.status_pembangunan = 'dalam_pembangunan') AS units_dalam_pembangunan,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND u.status_pembangunan = 'belum_mulai') AS units_belum_mulai,

          (SELECT COUNT(*)::int
             FROM users u
            WHERE u.role = 'customer'
              AND (${cid}::uuid IS NULL OR u.company_id = ${cid}::uuid)) AS customers_total,
          (SELECT COUNT(*)::int
             FROM users u
            WHERE u.role = 'customer'
              AND u.status = 'active'
              AND (${cid}::uuid IS NULL OR u.company_id = ${cid}::uuid)) AS customers_active,

          (SELECT COUNT(*)::int
             FROM property_assignments pa
             JOIN units u ON u.id = pa.unit_id
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)) AS assignments_total,
          (SELECT COUNT(*)::int
             FROM property_assignments pa
             JOIN units u ON u.id = pa.unit_id
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE (${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)
              AND pa.status_kepemilikan = 'active') AS assignments_active
      `);

      const stats = result[0];

      return {
        success: true,
        data: {
          projects: {
            total: stats.projects_total,
            active: stats.projects_active,
            completed: stats.projects_completed,
            on_hold: stats.projects_on_hold,
          },
          units: {
            total: stats.units_total,
            selesai: stats.units_selesai,
            dalam_pembangunan: stats.units_dalam_pembangunan,
            belum_mulai: stats.units_belum_mulai,
          },
          customers: {
            total: stats.customers_total,
            active: stats.customers_active,
          },
          assignments: {
            total: stats.assignments_total,
            active: stats.assignments_active,
          },
        },
      };
    },
  );

  // =========================================================
  // 1. ADMIN DASHBOARD
  // =========================================================
  fastify.get(
    "/admin",
    {
      schema: removeExamples({
        description:
          "Mendapatkan ringkasan dashboard untuk role admin dan super_admin.",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            total_projects: {
              type: "integer",
              description: "Jumlah total project",
              example: 12,
            },
            total_units: {
              type: "integer",
              description: "Jumlah total unit",
              example: 150,
            },
            units_sold: {
              type: "integer",
              description: "Jumlah unit yang sudah terjual",
              example: 85,
            },
            open_tickets: {
              type: "integer",
              description: "Jumlah tiket yang masih terbuka",
              example: 7,
            },
            total_revenue: {
              type: "number",
              description:
                "Total revenue dari pembayaran dengan status verified",
              example: 1250000000,
            },
          }),
        },
      }),
      preHandler: authorize("super_admin", "admin"),
    },
    async (request, reply) => {
      const cid = request.user.companyId;

      const result = await db.execute(sql`
  SELECT
    (SELECT COUNT(*) 
       FROM projects 
      WHERE company_id = ${cid}) AS total_projects,

    (SELECT COUNT(*) 
       FROM units u
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid}) AS total_units,

    (SELECT COUNT(*) 
       FROM property_assignments pa
       JOIN units u ON pa.unit_id = u.id
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid}) AS units_sold,

    (SELECT COUNT(*) 
       FROM customer_tickets ct
       JOIN property_assignments pa ON ct.assignment_id = pa.id
       JOIN units u ON pa.unit_id = u.id
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid} AND ct.status != 'closed') AS open_tickets,

    (SELECT COALESCE(SUM(ph.jumlah_bayar), 0)
       FROM payment_history ph
       JOIN property_assignments pa ON ph.assignment_id = pa.id
       JOIN units u ON pa.unit_id = u.id
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid}) AS total_revenue
`);

      return {
        success: true,
        data: result[0],
      };
    },
  );

  // =========================================================
  // 2. CUSTOMER SERVICE DASHBOARD
  // =========================================================
  fastify.get(
    "/customer-service",
    {
      schema: removeExamples({
        description: "Mendapatkan ringkasan dashboard untuk customer service.",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            open_tickets: {
              type: "integer",
              description: "Jumlah tiket dengan status open",
              example: 5,
            },
            pending_responses: {
              type: "integer",
              description: "Jumlah tiket dengan status in_progress",
              example: 3,
            },
            wa_sent_today: {
              type: "integer",
              description: "Jumlah pesan WhatsApp yang dikirim hari ini",
              example: 42,
            },
          }),
        },
      }),
      preHandler: authorize("customer_service"),
    },
    async (request, reply) => {
      const cid = request.user.companyId;

      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM projects WHERE company_id = ${cid}::uuid) AS total_projects,
          (SELECT COUNT(*) FROM units WHERE company_id = ${cid}::uuid) AS total_units,
          (SELECT COUNT(*) FROM units WHERE company_id = ${cid}::uuid AND status = 'sold') AS units_sold,
          (SELECT COUNT(*) FROM tickets WHERE company_id = ${cid}::uuid AND status != 'closed') AS open_tickets,
          (SELECT COALESCE(SUM(amount), 0)
             FROM payments
            WHERE company_id = ${cid}::uuid
              AND status = 'verified') AS total_revenue
      `);
      return {
        success: true,
        data: result[0],
      };
    },
  );

  // =========================================================
  // 3. GLOBAL ANALYTICS (SUPER ADMIN ONLY)
  // =========================================================
  fastify.get(
    "/analytics/global",
    {
      schema: removeExamples({
        description:
          "Mendapatkan statistik global seluruh perusahaan. Hanya untuk super_admin.",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            total_companies: {
              type: "integer",
              description: "Jumlah total perusahaan",
              example: 25,
            },
            total_customers: {
              type: "integer",
              description: "Jumlah total user dengan role customer",
              example: 1340,
            },
            revenue_global: {
              type: "number",
              description:
                "Total revenue dari seluruh pembayaran dengan status verified",
              example: 4589000000,
            },
          }),
        },
      }),
      preHandler: authorize("super_admin"),
    },
    async (request, reply) => {
      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM companies) AS total_companies,
          (SELECT COUNT(*)
             FROM users
            WHERE role = 'customer') AS total_customers,
          (SELECT COALESCE(SUM(amount), 0)
             FROM payments
            WHERE status = 'verified') AS revenue_global
      `);

      return {
        success: true,
        data: result[0],
      };
    },
  );
}
