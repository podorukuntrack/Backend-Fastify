// src/modules/dashboard/dashboard.routes.js
import { authorize } from '../../middleware/authorize.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { removeExamples } from '../../plugins/swagger.js';

export default async function dashboardRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  /**
   * Reusable success response schema
   */
  const successSchema = (dataProperties) =>
    removeExamples({
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        data: {
          type: 'object',
          properties: dataProperties
        }
      }
    });

  // =========================================================
  // 1. ADMIN DASHBOARD
  // =========================================================
  fastify.get(
    '/admin',
    {
      schema: removeExamples({
        description:
          'Mendapatkan ringkasan dashboard untuk role admin dan super_admin.',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            total_projects: {
              type: 'integer',
              description: 'Jumlah total project',
              example: 12
            },
            total_units: {
              type: 'integer',
              description: 'Jumlah total unit',
              example: 150
            },
            units_sold: {
              type: 'integer',
              description: 'Jumlah unit yang sudah terjual',
              example: 85
            },
            open_tickets: {
              type: 'integer',
              description: 'Jumlah tiket yang masih terbuka',
              example: 7
            },
            total_revenue: {
              type: 'number',
              description:
                'Total revenue dari pembayaran dengan status verified',
              example: 1250000000
            }
          })
        }
      }),
      preHandler: authorize('super_admin', 'admin')
    },
    async (request, reply) => {
      const cid = request.user.companyId;

      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM projects WHERE company_id = ${cid}) AS total_projects,
          (SELECT COUNT(*) FROM units WHERE company_id = ${cid}) AS total_units,
          (SELECT COUNT(*) FROM units WHERE company_id = ${cid} AND status = 'sold') AS units_sold,
          (SELECT COUNT(*) FROM tickets WHERE company_id = ${cid} AND status != 'closed') AS open_tickets,
          (SELECT COALESCE(SUM(amount), 0)
             FROM payments
            WHERE company_id = ${cid}
              AND status = 'verified') AS total_revenue
      `);

      return {
        success: true,
        data: result[0]
      };
    }
  );

  // =========================================================
  // 2. CUSTOMER SERVICE DASHBOARD
  // =========================================================
  fastify.get(
    '/customer-service',
    {
      schema: removeExamples({
        description:
          'Mendapatkan ringkasan dashboard untuk customer service.',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            open_tickets: {
              type: 'integer',
              description: 'Jumlah tiket dengan status open',
              example: 5
            },
            pending_responses: {
              type: 'integer',
              description: 'Jumlah tiket dengan status in_progress',
              example: 3
            },
            wa_sent_today: {
              type: 'integer',
              description: 'Jumlah pesan WhatsApp yang dikirim hari ini',
              example: 42
            }
          })
        }
      }),
      preHandler: authorize('customer_service')
    },
    async (request, reply) => {
      const cid = request.user.companyId;

      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)
             FROM tickets
            WHERE company_id = ${cid}
              AND status = 'open') AS open_tickets,
          (SELECT COUNT(*)
             FROM tickets
            WHERE company_id = ${cid}
              AND status = 'in_progress') AS pending_responses,
          (SELECT COUNT(*)
             FROM whatsapp_logs
            WHERE company_id = ${cid}
              AND DATE(sent_at) = CURRENT_DATE) AS wa_sent_today
      `);

      return {
        success: true,
        data: result[0]
      };
    }
  );

  // =========================================================
  // 3. GLOBAL ANALYTICS (SUPER ADMIN ONLY)
  // =========================================================
  fastify.get(
    '/analytics/global',
    {
      schema: removeExamples({
        description:
          'Mendapatkan statistik global seluruh perusahaan. Hanya untuk super_admin.',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: successSchema({
            total_companies: {
              type: 'integer',
              description: 'Jumlah total perusahaan',
              example: 25
            },
            total_customers: {
              type: 'integer',
              description: 'Jumlah total user dengan role customer',
              example: 1340
            },
            revenue_global: {
              type: 'number',
              description:
                'Total revenue dari seluruh pembayaran dengan status verified',
              example: 4589000000
            }
          })
        }
      }),
      preHandler: authorize('super_admin')
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
        data: result[0]
      };
    }
  );
}