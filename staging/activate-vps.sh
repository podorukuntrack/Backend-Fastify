#!/bin/bash
set -euo pipefail
cd /opt/prtrack-staging/app
runuser -u prtrack-staging-db -- psql -X -q -v ON_ERROR_STOP=1 -h /var/lib/prtrack-staging-db/run -p 55440 -d prtrack_staging <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO prtrack_sync_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO prtrack_sync_reader;
REVOKE EXECUTE ON FUNCTION public.sync_bump_version() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_enqueue_event() FROM PUBLIC;
SQL
set -a
. /etc/prtrack-staging/migration.env
set +a
export STAGING_TEST_CONFIRM="$STAGING_INSTANCE_ID"
node --test sync-tests/sync.test.js
unset STAGING_TEST_CONFIRM
chown -R root:root /opt/prtrack-staging/app
chown root:prtrack-staging /etc/prtrack-staging/runtime.env
chmod 0640 /etc/prtrack-staging/runtime.env
chmod 0600 /etc/prtrack-staging/migration.env /etc/prtrack-staging/read-token
systemctl enable --now prtrack-staging-db.service prtrack-staging-api.service
for attempt in $(seq 1 20); do curl -fsS http://127.0.0.1:3201/health && break; sleep 1; done
curl -fsS http://127.0.0.1:3100/health
systemctl is-active prtrack-staging-db.service prtrack-staging-api.service podorukun-si-api.service
ss -lnt '( sport = :3201 or sport = :55440 or sport = :3100 )'
