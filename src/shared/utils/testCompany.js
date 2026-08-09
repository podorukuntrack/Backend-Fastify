// src/shared/utils/testCompany.js
//
// Perusahaan uji coba ("Tester") dipakai untuk review Google Play / App Store dan
// demo internal. Datanya tidak boleh bocor ke tampilan lintas perusahaan milik
// owner/super_admin: hanya akun yang company_id-nya memang perusahaan tester
// tersebut yang boleh melihatnya.
//
// Identifikasi default lewat nama (ILIKE '%tester%') supaya tidak perlu migrasi
// kolom baru. Bisa dikunci ke UUID tertentu lewat env TEST_COMPANY_IDS bila nanti
// ada PT sah yang namanya kebetulan mengandung "tester".
import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";

const NAME_PATTERN = process.env.TEST_COMPANY_NAME_PATTERN || "%tester%";
const EXTRA_IDS = (process.env.TEST_COMPANY_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const extraIdsFragment = EXTRA_IDS.length
  ? sql` OR test_comp.id IN (${sql.join(
      EXTRA_IDS.map((id) => sql`${id}::uuid`),
      sql`, `
    )})`
  : sql``;

/** Subquery daftar id perusahaan tester. Dievaluasi di SQL, jadi helper di bawah sinkron. */
export const testCompaniesSubquery = sql`(SELECT test_comp.id FROM companies test_comp WHERE test_comp.nama_pt ILIKE ${NAME_PATTERN}${extraIdsFragment})`;

/**
 * Kondisi "baris ini bukan milik perusahaan tester".
 *
 * `viewerCompanyId` selalu dikecualikan: akun di dalam perusahaan tester tetap
 * melihat datanya sendiri secara utuh, tanpa perlu query tambahan untuk
 * mengecek status pemanggil.
 *
 * Kolom NULL sengaja diloloskan — itu data yatim, bukan data tester.
 *
 * @param {import('drizzle-orm').SQL} column kolom company_id, mis. sql`p.company_id`
 * @param {string|null|undefined} viewerCompanyId company_id milik user yang memanggil
 */
export const notTestCompany = (column, viewerCompanyId) => {
  const ownCompany = viewerCompanyId
    ? sql`${column} = ${viewerCompanyId}::uuid OR `
    : sql``;
  return sql`(${column} IS NULL OR ${ownCompany}${column} NOT IN ${testCompaniesSubquery})`;
};

/** Versi siap tempel ke rantai WHERE yang sudah ada. */
export const andNotTestCompany = (column, viewerCompanyId) =>
  sql` AND ${notTestCompany(column, viewerCompanyId)} `;

// ── Pemeriksaan di sisi JavaScript ───────────────────────────────────────────
// Dipakai untuk menolak request yang menargetkan perusahaan tester secara
// eksplisit (?companyId=...) dan untuk menandai cache key.

const TTL_MS = 5 * 60 * 1000;
let cache = { ids: null, at: 0 };

export const getTestCompanyIds = async () => {
  if (cache.ids && Date.now() - cache.at < TTL_MS) return cache.ids;

  const rows = await db.execute(sql`
    SELECT id FROM companies WHERE nama_pt ILIKE ${NAME_PATTERN}
  `);

  const ids = [...new Set([...rows.map((r) => r.id), ...EXTRA_IDS])];
  cache = { ids, at: Date.now() };
  return ids;
};

/** Dipanggil setelah perusahaan dibuat/diubah/dihapus agar daftar tidak basi. */
export const clearTestCompanyCache = () => {
  cache = { ids: null, at: 0 };
};

export const isTestCompanyId = (testIds, companyId) =>
  !!companyId && testIds.includes(companyId);

/** Penanda cache: hasil untuk penghuni tester berbeda dengan hasil untuk yang lain. */
export const testScopeTag = (viewerIsTester) => (viewerIsTester ? "tester" : "notest");
