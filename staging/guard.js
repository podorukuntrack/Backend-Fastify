import postgres from 'postgres';
export function validateTarget(env) {
  const required = ['STAGING_DATABASE_URL', 'STAGING_DB_HOST', 'STAGING_DB_PORT', 'STAGING_DB_NAME', 'STAGING_DB_ROLE', 'STAGING_INSTANCE_ID'];
  if (env.NODE_ENV !== 'staging' || required.some(k => !env[k])) throw new Error('Explicit staging identity required');
  const u = new URL(env.STAGING_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || u.hostname !== env.STAGING_DB_HOST ||
      (u.port || '5432') !== env.STAGING_DB_PORT || decodeURIComponent(u.pathname.slice(1)) !== env.STAGING_DB_NAME ||
      decodeURIComponent(u.username) !== env.STAGING_DB_ROLE || u.searchParams.has('host')) throw new Error('Staging target mismatch');
  if (!/^[0-9a-f-]{36}$/i.test(env.STAGING_INSTANCE_ID)) throw new Error('Invalid staging identity');
  if (Object.keys(env).some(k => /^(DATABASE_URL|REDIS_URL|SMTP_|R2_|OPENWA_|FIREBASE_|APPLE_|JWT_|PAYMENT_|STRIPE_|MIDTRANS_)/.test(k) && env[k]))
    throw new Error('Production or integration configuration forbidden');
}
export async function assertDatabaseIdentity(db, env, { ready = true } = {}) {
  const [r] = await db`SELECT current_database() AS name, current_user AS role,
    (SELECT oid::text FROM pg_database WHERE datname = current_database()) AS oid,
    rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  if (r.name !== env.STAGING_DB_NAME || r.role !== env.STAGING_DB_ROLE ||
    r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.rolreplication || r.rolbypassrls) throw new Error('Unsafe staging database role');
  const memberships = await db`SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = current_user)`;
  const other = await db`SELECT 1 FROM pg_database WHERE datname <> current_database() AND NOT datistemplate
    AND datallowconn AND has_database_privilege(current_user, oid, 'CONNECT')`;
  if (memberships.length || other.length) throw new Error('Database credentials are not isolated');
  const [marker] = await db`SELECT instance_id::text, database_oid::text, sanitized FROM staging_control.identity WHERE singleton`;
  if (!marker || marker.instance_id !== env.STAGING_INSTANCE_ID || marker.database_oid !== r.oid || (ready && !marker.sanitized))
    throw new Error('Unverified staging copy');
}
export async function connectStaging(env = process.env, options) {
  validateTarget(env);
  const db = postgres(env.STAGING_DATABASE_URL, { max: 4, connect_timeout: 10, prepare: false, onnotice: () => {} });
  try { await assertDatabaseIdentity(db, env, options); return db; }
  catch { await db.end(); throw new Error('Staging database guard rejected connection'); }
}
