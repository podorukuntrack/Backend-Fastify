// src/modules/dashboard/dashboard.routes.js
import { authorize } from "../../middleware/authorize.js";
import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";
import { removeExamples } from "../../plugins/swagger.js";
import { getCache, setCache, CACHE_TTL } from "../../shared/utils/cache.js";
import {
  getTestCompanyIds,
  isTestCompanyId,
  andNotTestCompany,
  notTestCompany,
  testScopeTag,
} from "../../shared/utils/testCompany.js";

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
      preHandler: authorize('super_admin', 'owner', 'admin', 'direksi'),
    },
    async (request, reply) => {
      const cid = request.user.companyId ?? null;

      // cid null berarti query di bawah jatuh ke cabang "IS NULL" = lintas perusahaan.
      // Itu hanya sah untuk super_admin & owner.
      if (!cid && !["super_admin", "owner"].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Akun Anda belum terhubung ke perusahaan mana pun. Hubungi Super Admin.',
          errors: [],
        });
      }

      // Data perusahaan tester tidak boleh ikut ke agregat lintas perusahaan.
      const testCompanyIds = await getTestCompanyIds();
      const viewerIsTester = isTestCompanyId(testCompanyIds, cid);
      const scopeProject = sql`((${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)${andNotTestCompany(sql`p.company_id`, cid)})`;
      const scopeUser = sql`((${cid}::uuid IS NULL OR u.company_id = ${cid}::uuid)${andNotTestCompany(sql`u.company_id`, cid)})`;

      const cacheKey = `dashboard:stats:v2:${cid || "global"}:${testScopeTag(viewerIsTester)}`;

      // 1. Cek Cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return reply.send({
          success: true,
          source: "cache",
          data: cachedData,
        });
      }

      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE ${scopeProject}) AS projects_total,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE ${scopeProject}
              AND p.status = 'active') AS projects_active,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE ${scopeProject}
              AND p.status = 'completed') AS projects_completed,
          (SELECT COUNT(*)::int
             FROM projects p
            WHERE ${scopeProject}
              AND p.status = 'on_hold') AS projects_on_hold,

          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}) AS units_total,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND u.status_pembangunan = 'selesai') AS units_selesai,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND u.status_pembangunan = 'dalam_pembangunan') AS units_dalam_pembangunan,
          (SELECT COUNT(*)::int
             FROM units u
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND u.status_pembangunan = 'belum_mulai') AS units_belum_mulai,

          (SELECT COUNT(*)::int
             FROM users u
            WHERE u.role = 'customer'
              AND ${scopeUser}) AS customers_total,
          (SELECT COUNT(*)::int
             FROM users u
            WHERE u.role = 'customer'
              AND u.status = 'active'
              AND ${scopeUser}) AS customers_active,

          (SELECT COUNT(*)::int
             FROM property_assignments pa
             JOIN units u ON u.id = pa.unit_id
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}) AS assignments_total,
          (SELECT COUNT(*)::int
             FROM property_assignments pa
             JOIN units u ON u.id = pa.unit_id
             JOIN clusters c ON c.id = u.cluster_id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND pa.status_kepemilikan = 'active') AS assignments_active,

          (SELECT COALESCE(SUM(pa.total_dibayar), 0)
             FROM property_assignments pa
             JOIN units u ON pa.unit_id = u.id
             JOIN clusters c ON u.cluster_id = c.id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}) AS total_revenue,

          (SELECT COALESCE(SUM(ph.jumlah_bayar), 0)
             FROM payment_history ph
             JOIN property_assignments pa ON ph.assignment_id = pa.id
             JOIN units u ON pa.unit_id = u.id
             JOIN clusters c ON u.cluster_id = c.id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND EXTRACT(MONTH FROM ph.tanggal_bayar) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM ph.tanggal_bayar) = EXTRACT(YEAR FROM CURRENT_DATE)
          ) AS revenue_this_month,

          (SELECT COUNT(*)::int
             FROM retention_complaints rc
             JOIN retentions r ON rc.retention_id = r.id
             JOIN units u ON r.unit_id = u.id
             JOIN clusters c ON u.cluster_id = c.id
             JOIN projects p ON p.id = c.project_id
            WHERE ${scopeProject}
              AND rc.status = 'pending') AS open_tickets
      `);

      const stats = result[0];

      const responseData = {
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
        financial: {
          total_revenue: stats.total_revenue,
          revenue_this_month: stats.revenue_this_month,
        },
        support: {
          open_tickets: stats.open_tickets,
        },
      };

      // 2. Simpan ke Cache (TTL 5 menit)
      await setCache(cacheKey, responseData, CACHE_TTL);

      return {
        success: true,
        source: "database",
        data: responseData,
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
            },
            total_units: {
              type: "integer",
              description: "Jumlah total unit",
            },
            units_sold: {
              type: "integer",
              description: "Jumlah unit yang sudah terjual",
            },
            open_tickets: {
              type: "integer",
              description: "Jumlah tiket yang masih terbuka",
            },
            total_revenue: {
              type: "number",
              description:
                "Total revenue dari pembayaran dengan status verified",
            },
          }),
        },
      }),
      preHandler: authorize('super_admin', 'owner', 'admin', 'direksi'),
    },
    async (request, reply) => {
      const cid = request.user.companyId;
      const cacheKey = `dashboard:admin:${cid || "global"}`;

      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return reply.send({ success: true, source: "cache", data: cachedData });
      }

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
       FROM retention_complaints rc
       JOIN retentions r ON rc.retention_id = r.id
       JOIN units u ON r.unit_id = u.id
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid} AND rc.status = 'pending') AS open_tickets,

    (SELECT COALESCE(SUM(pa.total_dibayar), 0)
       FROM property_assignments pa
       JOIN units u ON pa.unit_id = u.id
       JOIN clusters c ON u.cluster_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE p.company_id = ${cid}) AS total_revenue
`);

      const responseData = result[0];
      await setCache(cacheKey, responseData, CACHE_TTL);

      return {
        success: true,
        source: "database",
        data: responseData,
      };
    },
  );

  /**
   * Endpoint "/customer-service" dan "/analytics/global" DIHAPUS.
   *
   * Keduanya query tabel `payments` yang tidak ada di database (dan
   * "/customer-service" juga memakai units.company_id serta units.status yang
   * juga tidak ada), sehingga selalu membalas 500. Tidak dipanggil web maupun
   * aplikasi mobile. Statistik lintas perusahaan untuk super_admin & owner
   * tersedia di /stats dan /executive yang query-nya sudah benar.
   */

  // =========================================================
  // 4. EXECUTIVE DASHBOARD (DIREKSI & OWNER)
  // =========================================================
  fastify.get(
    "/executive",
    {
      schema: removeExamples({
        description: "Mendapatkan ringkasan dashboard eksekutif (khusus owner dan direksi).",
        tags: ["Dashboard"],
        querystring: {
          type: "object",
          properties: {
            companyId: { type: "string", format: "uuid" },
            startDate: { type: "string" },
            endDate: { type: "string" }
          }
        },
        security: [{ bearerAuth: [] }],
      }),
      preHandler: authorize('owner', 'direksi', 'super_admin', 'admin'),
    },
    async (request, reply) => {
      let cid = request.user.companyId ?? null;
      if (['owner', 'super_admin'].includes(request.user.role) && request.query.companyId) {
        cid = request.query.companyId;
      }

      // Sama seperti /stats: cid null = lintas perusahaan, hanya untuk super_admin & owner.
      if (!cid && !["super_admin", "owner"].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Akun Anda belum terhubung ke perusahaan mana pun. Hubungi Super Admin.',
          errors: [],
        });
      }

      const viewerCompanyId = request.user.companyId ?? null;
      const testCompanyIds = await getTestCompanyIds();
      const viewerIsTester = isTestCompanyId(testCompanyIds, viewerCompanyId);

      // Owner/super_admin tidak boleh menembus ke perusahaan tester lewat ?companyId.
      if (!viewerIsTester && isTestCompanyId(testCompanyIds, cid)) {
        return reply.code(403).send({
          success: false,
          message: 'Perusahaan ini tidak tersedia pada dashboard.',
          errors: [],
        });
      }

      const scopeProject = sql`((${cid}::uuid IS NULL OR p.company_id = ${cid}::uuid)${andNotTestCompany(sql`p.company_id`, viewerCompanyId)})`;

      const { startDate, endDate } = request.query;
      const cacheKey = `dashboard:executive:v4:${cid || "global"}:${startDate || "all"}:${endDate || "all"}:${testScopeTag(viewerIsTester)}`;

      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return reply.send({ success: true, source: "cache", data: cachedData });
      }

      const dateFilter = startDate && endDate 
        ? sql` AND pa.tanggal_pembelian >= ${startDate}::date AND pa.tanggal_pembelian <= ${endDate}::date ` 
        : sql``;

      // Financials
      const financeResult = await db.execute(sql`
        SELECT 
          (SELECT COALESCE(SUM(pa.harga_total), 0)
           FROM property_assignments pa
           JOIN units u ON pa.unit_id = u.id
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON p.id = c.project_id
           WHERE ${scopeProject}
             AND pa.status_kepemilikan = 'active'
             ${dateFilter}) as total_revenue_target,
             
          (SELECT COALESCE(SUM(ph.jumlah_bayar), 0)
           FROM payment_history ph
           JOIN property_assignments pa ON ph.assignment_id = pa.id
           JOIN units u ON pa.unit_id = u.id
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON p.id = c.project_id
           WHERE ${scopeProject}
             ${startDate && endDate ? sql` AND ph.tanggal_bayar >= ${startDate}::date AND ph.tanggal_bayar <= ${endDate}::date ` : sql``}) as total_cash_in,
             
          (SELECT COALESCE(SUM(
            (pa.harga_total - pa.total_dibayar)
          ), 0)
           FROM property_assignments pa
           JOIN units u ON pa.unit_id = u.id
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON p.id = c.project_id
           WHERE ${scopeProject}
             AND pa.status_kepemilikan = 'active'
             ${dateFilter}) as total_piutang
      `);

      const paymentDateFilter = startDate && endDate 
        ? sql` AND ph.tanggal_bayar >= ${startDate}::date AND ph.tanggal_bayar <= ${endDate}::date ` 
        : sql``;

      const salesTrendResult = await db.execute(sql`
        SELECT 
          DATE(ph.tanggal_bayar) as date,
          COALESCE(SUM(ph.jumlah_bayar), 0) as revenue
        FROM payment_history ph
        JOIN property_assignments pa ON ph.assignment_id = pa.id
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON p.id = c.project_id
        WHERE ${scopeProject}
        ${paymentDateFilter}
        GROUP BY DATE(ph.tanggal_bayar)
        ORDER BY date ASC
      `);

      // Sales
      const salesResult = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM units u
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON p.id = c.project_id
           WHERE ${scopeProject}) as total_units,
          (SELECT COUNT(*) FROM property_assignments pa
           JOIN units u ON pa.unit_id = u.id
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON p.id = c.project_id
           WHERE ${scopeProject} AND pa.status_kepemilikan = 'active'
           ${dateFilter}) as units_sold,
          (SELECT COUNT(DISTINCT pa.user_id) FROM property_assignments pa
           JOIN units u ON pa.unit_id = u.id
           JOIN clusters c ON u.cluster_id = c.id
           JOIN projects p ON c.project_id = p.id
           WHERE ${scopeProject} AND pa.status_kepemilikan = 'active'
           ${dateFilter}) as total_customers
      `);

      // Payment methods distribution
      const paymentMethodsResult = await db.execute(sql`
        SELECT pa.tipe_pembayaran as method, COUNT(*) as count
        FROM property_assignments pa
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON p.id = c.project_id
        WHERE ${scopeProject} AND pa.status_kepemilikan = 'active'
        GROUP BY pa.tipe_pembayaran
      `);

      // Multi-tenant Leaderboard (only if owner/super_admin)
      let leaderboard = [];
      if (!cid) {
        const leaderResult = await db.execute(sql`
          SELECT 
            comp.id as company_id,
            comp.nama_pt as company_name,
            COUNT(DISTINCT pa.id) as units_sold,
            COALESCE(SUM(pa.harga_total), 0) as total_revenue
          FROM companies comp
          LEFT JOIN projects p ON p.company_id = comp.id
          LEFT JOIN clusters c ON c.project_id = p.id
          LEFT JOIN units u ON u.cluster_id = c.id
          LEFT JOIN property_assignments pa ON pa.unit_id = u.id AND pa.status_kepemilikan = 'active' ${dateFilter}
          WHERE ${notTestCompany(sql`comp.id`, viewerCompanyId)}
          GROUP BY comp.id, comp.nama_pt
          ORDER BY total_revenue DESC
        `);
        leaderboard = leaderResult;
      }

      const responseData = {
        finance: financeResult[0],
        sales: salesResult[0],
        sales_trend: salesTrendResult,
        payment_methods: paymentMethodsResult,
        leaderboard: leaderboard
      };

      await setCache(cacheKey, responseData, CACHE_TTL);

      return {
        success: true,
        source: "database",
        data: responseData,
      };
    }
  );

  // GET /drilldown
  fastify.get(
    "/drilldown",
    {
      schema: {
        description: "Mendapatkan data drill-down komprehensif untuk dashboard (revenue, cash_in, piutang, occupancy)",
        tags: ["Dashboard"],
        querystring: {
          type: "object",
          properties: {
            companyId: { type: "string", format: "uuid" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" }
          }
        },
        response: {
          200: successSchema({
            revenue: { type: "array" },
            cash_in: { type: "array" },
            piutang: { type: "array" },
            occupancy: { type: "array" },
            customers: { type: "array" }
          })
        }
      },
      preHandler: authorize('super_admin', 'owner', 'admin', 'direksi'),
    },
    async (request, reply) => {
      const user = request.user;
      let filterCid = null;

      // Filter logic (owner can specify companyId)
      if (["super_admin", "owner"].includes(user.role)) {
        if (request.query.companyId) {
          filterCid = request.query.companyId;
        }
      } else {
        filterCid = user.companyId;

        // Hanya super_admin & owner yang boleh melihat lintas perusahaan.
        // Tanpa penjagaan ini, admin/direksi tanpa company_id akan lolos ke
        // cabang "IS NULL" pada setiap query di bawah dan menerima data semua PT.
        if (!filterCid) {
          return reply.code(403).send({
            success: false,
            message: 'Akun Anda belum terhubung ke perusahaan mana pun. Hubungi Super Admin.',
            errors: [],
          });
        }
      }

      const viewerCompanyId = user.companyId ?? null;
      const testCompanyIds = await getTestCompanyIds();
      const viewerIsTester = isTestCompanyId(testCompanyIds, viewerCompanyId);

      if (!viewerIsTester && isTestCompanyId(testCompanyIds, filterCid)) {
        return reply.code(403).send({
          success: false,
          message: 'Perusahaan ini tidak tersedia pada dashboard.',
          errors: [],
        });
      }

      const scopeProject = sql`((${filterCid}::uuid IS NULL OR p.company_id = ${filterCid}::uuid)${andNotTestCompany(sql`p.company_id`, viewerCompanyId)})`;

      const sDate = request.query.startDate || null;
      const eDate = request.query.endDate || null;

      const cacheKey = `dashboard:drilldown:v3:${filterCid || "global"}:${sDate || "all"}:${eDate || "all"}:${testScopeTag(viewerIsTester)}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      // Query for Revenue (all active assignments) & Piutang (active assignments with piutang > 0)
      const assignmentsResult = await db.execute(sql`
        SELECT 
          pa.id as assignment_id,
          u.id as unit_id,
          u.nomor_unit,
          c.id as cluster_id,
          c.nama_cluster,
          p.id as project_id,
          p.nama_proyek,
          p.company_id,
          comp.nama_pt as company_name,
          buyer.nama as customer_name,
          pa.tanggal_pembelian,
          pa.tipe_pembayaran,
          pa.harga_total,
          pa.dp,
          pa.total_dibayar,
          pa.total_dibayar as effective_cash_in,
          (pa.harga_total - pa.total_dibayar) as effective_piutang,
          pa.jatuh_tempo_kpr,
          -- Menandai cicilan yang sudah lewat tenggat. Berlaku untuk kredit_kpr
          -- maupun cash_cicil; 0 berarti belum jatuh tempo atau sudah lunas.
          CASE
            WHEN pa.tipe_pembayaran IN ('kredit_kpr', 'cash_cicil')
             AND pa.jatuh_tempo_kpr IS NOT NULL
             AND pa.total_dibayar < pa.harga_total
             AND pa.jatuh_tempo_kpr::date < CURRENT_DATE
            THEN (CURRENT_DATE - pa.jatuh_tempo_kpr::date)
            ELSE 0
          END AS hari_telat
        FROM property_assignments pa
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON p.id = c.project_id
        JOIN companies comp ON p.company_id = comp.id
        JOIN users buyer ON pa.user_id = buyer.id
        WHERE pa.status_kepemilikan = 'active'
          AND ${scopeProject}
          AND (${sDate}::date IS NULL OR pa.tanggal_pembelian >= ${sDate}::date)
          AND (${eDate}::date IS NULL OR pa.tanggal_pembelian <= ${eDate}::date)
        ORDER BY pa.tanggal_pembelian DESC
      `);

      const revenue = assignmentsResult; 
      const piutang = assignmentsResult.filter(a => Number(a.effective_piutang) > 0);
      
      const cashInResult = await db.execute(sql`
        SELECT 
          pa.id as assignment_id,
          u.id as unit_id,
          u.nomor_unit,
          c.id as cluster_id,
          c.nama_cluster,
          p.id as project_id,
          p.nama_proyek,
          p.company_id,
          comp.nama_pt as company_name,
          buyer.nama as customer_name,
          pa.tanggal_pembelian,
          pa.tipe_pembayaran,
          SUM(ph.jumlah_bayar) as effective_cash_in
        FROM payment_history ph
        JOIN property_assignments pa ON ph.assignment_id = pa.id
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON p.id = c.project_id
        JOIN companies comp ON p.company_id = comp.id
        JOIN users buyer ON pa.user_id = buyer.id
        WHERE ${scopeProject}
          AND (${sDate}::date IS NULL OR ph.tanggal_bayar >= ${sDate}::date)
          AND (${eDate}::date IS NULL OR ph.tanggal_bayar <= ${eDate}::date)
        GROUP BY pa.id, u.id, u.nomor_unit, c.id, c.nama_cluster, p.id, p.nama_proyek, p.company_id, comp.nama_pt, buyer.nama, pa.tanggal_pembelian, pa.tipe_pembayaran
        ORDER BY effective_cash_in DESC
      `);
      
      const cash_in = cashInResult.filter(a => Number(a.effective_cash_in) > 0);
      
      const unitsResult = await db.execute(sql`
        SELECT 
          u.id as unit_id, u.nomor_unit, u.status_pembangunan, u.progress_percentage,
          c.id as cluster_id, c.nama_cluster, p.id as project_id, p.nama_proyek, comp.nama_pt as company_name,
          (CASE WHEN pa.id IS NOT NULL THEN true ELSE false END) as is_sold,
          buyer.nama as customer_name,
          (SELECT r.due_date FROM retentions r WHERE r.unit_id = u.id AND r.status = 'active' ORDER BY r.created_at DESC LIMIT 1) as retention_due_date
        FROM units u
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON p.id = c.project_id
        JOIN companies comp ON p.company_id = comp.id
        LEFT JOIN property_assignments pa ON pa.unit_id = u.id AND pa.status_kepemilikan = 'active'
        LEFT JOIN users buyer ON pa.user_id = buyer.id
        WHERE ${scopeProject}
          AND (
            (${sDate}::date IS NULL AND ${eDate}::date IS NULL)
            OR (pa.tanggal_pembelian >= ${sDate}::date AND pa.tanggal_pembelian <= ${eDate}::date)
          )
        ORDER BY p.nama_proyek ASC, c.nama_cluster ASC, u.nomor_unit ASC
      `);

      const customersResult = await db.execute(sql`
        SELECT 
          COALESCE(buyer.id, pa.id) as customer_id,
          COALESCE(buyer.nama, 'Customer (Belum Terdaftar)') as customer_name,
          STRING_AGG(DISTINCT comp.nama_pt, ', ') as company_name,
          COUNT(pa.id) as total_units_bought,
          COALESCE(SUM(pa.harga_total), 0) as total_transaction_value,
          COALESCE(SUM(
            (pa.harga_total - pa.total_dibayar)
          ), 0) as total_piutang
        FROM property_assignments pa
        LEFT JOIN users buyer ON pa.user_id = buyer.id
        JOIN units u ON pa.unit_id = u.id
        JOIN clusters c ON u.cluster_id = c.id
        JOIN projects p ON c.project_id = p.id
        JOIN companies comp ON p.company_id = comp.id
        WHERE ${scopeProject}
          AND pa.status_kepemilikan = 'active'
          AND (${sDate}::date IS NULL OR pa.tanggal_pembelian >= ${sDate}::date)
          AND (${eDate}::date IS NULL OR pa.tanggal_pembelian <= ${eDate}::date)
        GROUP BY COALESCE(buyer.id, pa.id), COALESCE(buyer.nama, 'Customer (Belum Terdaftar)')
        ORDER BY total_transaction_value DESC
      `);

      const responseData = {
        revenue,
        cash_in,
        piutang,
        occupancy: unitsResult,
        customers: customersResult
      };

      await setCache(cacheKey, responseData, CACHE_TTL); 

      return {
        success: true,
        source: "database",
        data: responseData
      };
    }
  );
}
