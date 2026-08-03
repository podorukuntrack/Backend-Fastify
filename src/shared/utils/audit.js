// src/shared/utils/audit.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

/**
 * Jejak audit tindakan admin yang sensitif.
 *
 * PRINSIP
 * Pencatatan audit TIDAK BOLEH menggagalkan operasi bisnis. Setiap kesalahan
 * ditelan dan dicatat ke log server saja — kalau tabelnya bermasalah, admin tetap
 * harus bisa bekerja. Konsekuensinya jejak ini bersifat upaya-terbaik, bukan
 * jaminan transaksional.
 *
 * JANGAN menaruh kata sandi, token, atau kode OTP di dalam metadata.
 */

export const AuditAction = {
  // Manajemen pengguna
  USER_CREATED:        'user.created',
  USER_UPDATED:        'user.updated',
  USER_ROLE_CHANGED:   'user.role_changed',
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_DELETED:        'user.deleted',
  ACCOUNT_SELF_DELETED:'account.self_deleted',

  // Penugasan & keuangan
  ASSIGNMENT_CREATED:  'assignment.created',
  ASSIGNMENT_UPDATED:  'assignment.updated',
  ASSIGNMENT_DELETED:  'assignment.deleted',
  PAYMENT_CREATED:     'payment.created',
  PAYMENT_UPDATED:     'payment.updated',
  PAYMENT_DELETED:     'payment.deleted',

  // Struktur proyek
  PROJECT_DELETED:     'project.deleted',
  CLUSTER_DELETED:     'cluster.deleted',
  UNIT_DELETED:        'unit.deleted',
  COMPANY_CREATED:     'company.created',
  COMPANY_UPDATED:     'company.updated',
  COMPANY_DELETED:     'company.deleted',

  // Keamanan
  LOGIN_THROTTLED:     'auth.login_throttled',
  OTP_THROTTLED:       'auth.otp_throttled',
};

/** UUID valid atau null — kolomnya bertipe uuid, string sembarang akan menggagalkan INSERT. */
const asUuid = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    ? v
    : null;

/**
 * @param {object}  o
 * @param {object}  [o.request]  Request Fastify — dipakai mengambil pelaku dan IP.
 * @param {string}  o.action     Salah satu nilai AuditAction.
 * @param {string}  o.entity     Jenis entitas: 'user', 'assignment', ...
 * @param {string}  [o.entityId]
 * @param {string}  [o.summary]  Ringkasan singkat yang bisa dibaca manusia.
 * @param {object}  [o.metadata] Konteks tambahan (tanpa data rahasia).
 * @param {object}  [o.actor]    Pengganti request bila konteksnya bukan HTTP.
 */
export const recordAudit = async ({
  request,
  action,
  entity,
  entityId = null,
  summary = null,
  metadata = {},
  actor = null,
}) => {
  try {
    const u = actor ?? request?.user ?? {};
    const ip = request?.ip ?? null;

    await db.execute(sql`
      INSERT INTO audit_logs
        (actor_id, actor_role, actor_email, company_id, action, entity, entity_id, summary, metadata, ip)
      VALUES (
        ${asUuid(u.sub ?? u.id)},
        ${u.role ?? null},
        ${u.email ?? null},
        ${asUuid(u.companyId ?? u.company_id)},
        ${action},
        ${entity},
        ${asUuid(entityId)},
        ${summary},
        ${JSON.stringify(metadata ?? {})}::jsonb,
        ${ip}
      )
    `);
  } catch (err) {
    // Sengaja tidak dilempar ulang: kegagalan audit tidak boleh membatalkan
    // tindakan yang sudah berhasil dikerjakan.
    console.error('[Audit] Gagal mencatat:', action, '-', err.message);
  }
};

/**
 * Membaca jejak audit dengan pembatasan sesuai peran.
 * super_admin melihat seluruhnya; admin & direksi hanya perusahaannya.
 */
export const findAuditLogs = async (userContext, filters = {}) => {
  const limit = Math.min(Number(filters.limit ?? 50), 200);
  const page = Math.max(Number(filters.page ?? 1), 1);
  const offset = (page - 1) * limit;

  const scope = ['super_admin', 'owner'].includes(userContext.role)
    ? sql`true`
    : sql`al.company_id = ${asUuid(userContext.companyId)}::uuid`;

  const action = filters.action ?? null;
  const entity = filters.entity ?? null;

  const rows = await db.execute(sql`
    SELECT al.id, al.actor_id, al.actor_role, al.actor_email, al.company_id,
           al.action, al.entity, al.entity_id, al.summary, al.metadata, al.ip, al.created_at,
           u.nama AS actor_nama
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE ${scope}
      AND (${action}::text IS NULL OR al.action = ${action}::text)
      AND (${entity}::text IS NULL OR al.entity = ${entity}::text)
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const [{ count }] = await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM audit_logs al
    WHERE ${scope}
      AND (${action}::text IS NULL OR al.action = ${action}::text)
      AND (${entity}::text IS NULL OR al.entity = ${entity}::text)
  `);

  return {
    data: rows,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
  };
};
