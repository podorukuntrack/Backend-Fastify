#!/bin/bash
# =============================================================
# flush-cache.sh — Script untuk membersihkan Redis cache
# Jalankan setelah deploy untuk menghapus cache key lama
# yang tidak memiliki companyId scoping
# =============================================================

set -e

# Warna output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW} PodoRukunTrack - Redis Cache Flush     ${NC}"
echo -e "${YELLOW}========================================${NC}"

# Cek apakah Redis CLI tersedia
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}❌ redis-cli tidak ditemukan. Pastikan Redis terinstall.${NC}"
    exit 1
fi

# Default Redis connection
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Parse REDIS_URL jika ada (format: redis://:password@host:port)
if [ -n "$REDIS_URL" ]; then
    # Extract host, port, password from REDIS_URL
    PARSED_HOST=$(echo "$REDIS_URL" | sed -n 's|.*@\(.*\):\([0-9]*\).*|\1|p')
    PARSED_PORT=$(echo "$REDIS_URL" | sed -n 's|.*@\(.*\):\([0-9]*\).*|\2|p')
    PARSED_PASSWORD=$(echo "$REDIS_URL" | sed -n 's|redis://:\(.*\)@.*|\1|p')
    
    [ -n "$PARSED_HOST" ] && REDIS_HOST="$PARSED_HOST"
    [ -n "$PARSED_PORT" ] && REDIS_PORT="$PARSED_PORT"
    [ -n "$PARSED_PASSWORD" ] && REDIS_PASSWORD="$PARSED_PASSWORD"
fi

# Build redis-cli command
REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD --no-auth-warning"
fi

echo -e "\n📡 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}..."

# Test connection
if ! $REDIS_CMD ping > /dev/null 2>&1; then
    echo -e "${RED}❌ Gagal terhubung ke Redis. Periksa konfigurasi koneksi.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Connected to Redis${NC}\n"

# Mode selection
MODE="${1:-selective}"

if [ "$MODE" = "all" ] || [ "$MODE" = "flushall" ]; then
    echo -e "${RED}⚠️  MODE: FLUSH ALL — Menghapus SEMUA data di Redis${NC}"
    read -p "Apakah Anda yakin? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        $REDIS_CMD FLUSHDB
        echo -e "${GREEN}✅ FLUSHDB berhasil. Semua cache telah dihapus.${NC}"
    else
        echo -e "${YELLOW}Dibatalkan.${NC}"
        exit 0
    fi
else
    echo -e "${YELLOW}MODE: SELECTIVE — Menghapus cache patterns yang terpengaruh${NC}\n"
    
    # Patterns to flush — all module cache keys that need companyId scoping
    PATTERNS=(
        "payments:*"
        "assignments:*"
        "users:*"
        "companies:*"
        "clusters:*"
        "documentations:*"
        "handovers:*"
        "progress:*"
        "projects:*"
        "retentions:*"
        "timelines:*"
        "units:*"
        "unit:*"
        "stats:*"
        "dashboard:*"
    )
    
    TOTAL_DELETED=0
    
    for pattern in "${PATTERNS[@]}"; do
        # Count keys matching pattern
        COUNT=$($REDIS_CMD --scan --pattern "$pattern" 2>/dev/null | wc -l)
        
        if [ "$COUNT" -gt 0 ]; then
            # Delete keys matching pattern using SCAN to avoid blocking
            DELETED=$($REDIS_CMD --scan --pattern "$pattern" 2>/dev/null | xargs -r $REDIS_CMD DEL 2>/dev/null | tail -1)
            DELETED=${DELETED:-0}
            TOTAL_DELETED=$((TOTAL_DELETED + COUNT))
            echo -e "  🗑  ${pattern} — ${GREEN}${COUNT} keys deleted${NC}"
        else
            echo -e "  ⏭  ${pattern} — no keys found"
        fi
    done
    
    echo -e "\n${GREEN}✅ Selesai! Total ${TOTAL_DELETED} cache keys dihapus.${NC}"
fi

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW} Cache flush selesai.                   ${NC}"
echo -e "${YELLOW} Pastikan backend di-restart jika perlu ${NC}"
echo -e "${YELLOW}========================================${NC}"
