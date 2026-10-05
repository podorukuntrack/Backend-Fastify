#!/bin/bash
set -euo pipefail
[ "$(id -u)" -eq 0 ]
[ -n "${STAGING_DELETE_CONFIRM:-}" ]
[ "$STAGING_DELETE_CONFIRM" = "$(cat /etc/prtrack-staging/instance-id)" ]
for path in /opt/prtrack-staging /var/lib/prtrack-staging-db /etc/prtrack-staging; do
 [ ! -L "$path" ] && [ "$(realpath -- "$path")" = "$path" ]
done
systemctl disable --now prtrack-staging-api.service prtrack-staging-db.service
rm -- /etc/systemd/system/prtrack-staging-api.service /etc/systemd/system/prtrack-staging-db.service /etc/systemd/journald@prtrack-staging.conf
systemctl daemon-reload
rm -rf -- /opt/prtrack-staging /var/lib/prtrack-staging-db /etc/prtrack-staging
userdel prtrack-staging
userdel prtrack-staging-db
systemctl is-active podorukun-si-api.service
curl -fsS http://127.0.0.1:3100/health
