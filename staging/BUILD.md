# Building the isolated deployment bundle

Do not copy the backend working directory or its `.env` to the VPS.

The deployed bundle contains only `src/modules/sync/`, `staging/`, `sync-tests/`, and these pinned manifests renamed to `package.json` / `package-lock.json`: `deploy-package.json`, `deploy-package-lock.json`. Install with `npm ci --ignore-scripts --omit=dev`. Do not use the production PM2 ecosystem or compose files. Root backend package changes predate this work.

Initial setup on an audited empty target:

1. Create a consistent source backup with `backup-source.js` from the source repository, supplying the expected source host explicitly. The Windows local helper uses installed PostgreSQL 18 tools. It only reads the source and does not use a staging environment file.
2. Restore into a fresh isolated local cluster with `local-restore.js`; the helper refuses duplicate role/database names. Inspect the protected schema/constraint inventory before sanitization. Never use this fixed localhost helper against another existing cluster.
3. `sanitize-copy.js` runs with the exact staging environment, compares the full reviewed schema inventory, removes sessions/device tokens and disables original credentials. An administrator independently verifies sanitization, disables original accounts, and marks the identity ready. The marker schema must be administrator-owned; grant only SELECT to migration/runtime roles. Do not set sanitized=true merely to bypass the guard.
4. Export the sanitized copy before applying sync migration. `sanitized-manifest.json` is the reviewed baseline for this deployment, not a generic seed. For PostgreSQL 16, remove only the unsupported `SET transaction_timeout = 0` dump statement. Fail on any further restore error.
5. Upload bundle, sanitized SQL, service files, scripts, and journal configuration into a new mode-0700 staging upload directory. `provision-vps.sh` refuses existing resource paths and provisions only the named staging users/cluster. PostgreSQL package is extracted, not installed globally.
6. Extract the bundle to `/opt/prtrack-staging/app`, generate staging-only credentials with `provision-secrets.js`, install the minimal dependencies, run `restore-vps.js`, then guarded `migrate.js` using root-only migration.env. `restore-vps.js` requires an empty public schema and verifies counts/sanitization before enrolling the new database marker.
7. Install the namespace journal config, run `activate-vps.sh`, and use `verify-integrity.js` / `verify-runtime.js`. Only activate PRSI test sync after its separate target is verified and contract risks reviewed.

The production migration chain must not apply sync. `drizzle/0004_sync_read_only.sql` intentionally fails; the only supported pilot migration is `staging/migrate.js` + `staging/sync.sql`.
