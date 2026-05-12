// src/modules/dashboard/dashboard.routes.js
import { authorize } from '../../middleware/authorize.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export default async function dashboardRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  // === 1. ADMIN DASHBOARD ===
  fastify.get('/admin', { preHandler: authorize('super_admin', 'admin') }, async (request, reply) => {
    const cid = request.user.companyId;
    // Menggunakan execute sql agar query agregasi kompleks berjalan cepat
    const result = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE company_id = ${cid}) as total_projects,
        (SELECT COUNT(*) FROM units WHERE company_id = ${cid}) as total_units,
        (SELECT COUNT(*) FROM units WHERE company_id = ${cid} AND status = 'sold') as units_sold,
        (SELECT COUNT(*) FROM tickets WHERE company_id = ${cid} AND status != 'closed') as open_tickets,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE company_id = ${cid} AND status = 'verified') as total_revenue
    `);
    return { success: true, data: result[0] };
  });

  // === 2. CUSTOMER SERVICE DASHBOARD ===
  fastify.get('/customer-service', { preHandler: authorize('customer_service') }, async (request, reply) => {
    const cid = request.user.companyId;
    const result = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM tickets WHERE company_id = ${cid} AND status = 'open') as open_tickets,
        (SELECT COUNT(*) FROM tickets WHERE company_id = ${cid} AND status = 'in_progress') as pending_responses,
        (SELECT COUNT(*) FROM whatsapp_logs WHERE company_id = ${cid} AND DATE(sent_at) = CURRENT_DATE) as wa_sent_today
    `);
    return { success: true, data: result[0] };
  });

  // === 3. SUPER ADMIN ANALYTICS ===
  fastify.get('/analytics/global', { preHandler: authorize('super_admin') }, async (request, reply) => {
    const result = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM companies) as total_companies,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'verified') as revenue_global
    `);
    return { success: true, data: result[0] };
  });
}