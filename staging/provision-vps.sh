#!/bin/bash
set -euo pipefail
[ "$(id -u)" -eq 0 ]
[ ! -e /opt/prtrack-staging ]
[ ! -e /var/lib/prtrack-staging-db ]
[ ! -e /etc/prtrack-staging ]
! id prtrack-staging >/dev/null 2>&1
! id prtrack-staging-db >/dev/null 2>&1
systemctl is-active --quiet podorukun-si-api.service
curl -fsS http://127.0.0.1:3100/health >/dev/null
! ss -lntH | awk '{print $4}' | grep -Eq ':(3201|55440)$'
useradd --system --home-dir /opt/prtrack-staging --shell /usr/sbin/nologin prtrack-staging
useradd --system --home-dir /var/lib/prtrack-staging-db --shell /usr/sbin/nologin prtrack-staging-db
install -d -m 0755 /opt/prtrack-staging/app
install -d -m 0700 -o prtrack-staging-db -g prtrack-staging-db /var/lib/prtrack-staging-db /var/lib/prtrack-staging-db/run
install -d -m 0750 -o root -g prtrack-staging /etc/prtrack-staging
cd /tmp/prtrack-pilot-upload
apt-get download postgresql-16
install -d /opt/prtrack-staging/pg16
dpkg-deb -x ./postgresql-16_*.deb /opt/prtrack-staging/pg16
runuser -u prtrack-staging-db -- /opt/prtrack-staging/pg16/usr/lib/postgresql/16/bin/initdb -D /var/lib/prtrack-staging-db/data -U prtrack-staging-db --auth-local=peer --auth-host=scram-sha-256 --encoding=UTF8 --locale=C > /var/lib/prtrack-staging-db/init.log
cat >> /var/lib/prtrack-staging-db/data/postgresql.conf <<'CONF'
listen_addresses = '127.0.0.1'
port = 55440
unix_socket_directories = '/var/lib/prtrack-staging-db/run'
max_connections = 20
shared_buffers = '64MB'
work_mem = '2MB'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%a.log'
log_rotation_age = '1d'
log_truncate_on_rotation = on
log_statement = 'none'
log_min_error_statement = 'panic'
CONF
install -m 0644 /tmp/prtrack-pilot-upload/prtrack-staging-db.service /etc/systemd/system/prtrack-staging-db.service
install -m 0644 /tmp/prtrack-pilot-upload/prtrack-staging-api.service /etc/systemd/system/prtrack-staging-api.service
systemctl daemon-reload
systemctl start prtrack-staging-db.service
for attempt in $(seq 1 20); do /usr/bin/pg_isready -h 127.0.0.1 -p 55440 >/dev/null && break; sleep 1; done
curl -fsS http://127.0.0.1:3100/health >/dev/null
