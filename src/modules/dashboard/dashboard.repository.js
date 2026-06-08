import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const getAdminStats = async (companyId) => {
  const result = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM projects WHERE company_id = ${companyId}) as total_projects,
      (SELECT COUNT(u.id) 
       FROM units u 
       JOIN clusters c ON u.cluster_id = c.id 
       JOIN projects p ON c.project_id = p.id 
       WHERE p.company_id = ${companyId}) as total_units,
      (SELECT COUNT(pa.id) 
       FROM property_assignments pa 
       JOIN units u ON pa.unit_id = u.id 
       JOIN clusters c ON u.cluster_id = c.id 
       JOIN projects p ON c.project_id = p.id 
       WHERE p.company_id = ${companyId} AND pa.status_kepemilikan = 'active') as units_sold,
      (SELECT COUNT(*) FROM tickets WHERE company_id = ${companyId} AND status != 'closed') as open_tickets,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE company_id = ${companyId} AND status = 'verified') as total_revenue
  `);
  return result[0];
};

export const getCSStats = async (companyId) => {
  const result = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM tickets WHERE company_id = ${companyId} AND status = 'open') as open_tickets,
      (SELECT COUNT(*) FROM tickets WHERE company_id = ${companyId} AND status = 'in_progress') as pending_responses,
      (SELECT COUNT(*) FROM whatsapp_logs WHERE company_id = ${companyId} AND DATE(sent_at) = CURRENT_DATE) as wa_sent_today
  `);
  return result[0];
};

export const getGlobalStats = async () => {
  const result = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM companies) as total_companies,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'verified') as revenue_global
  `);
  return result[0];
};