#!/usr/bin/env bash
# Mythicove 备份脚本：Postgres dump + 纹理/文件卷打包。
# 用法（workspace 根目录，compose 栈运行中）：
#   BACKUP_DIR=/var/backups/mythicove ./docs/deploy/backup.sh
# 建议 cron：0 3 * * *（每日 03:00），保留 14 天。
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST"

echo "==> Postgres dump"
docker compose exec -T db pg_dump -U mirror -d mirror --format=custom --compress=9 > "$DEST/postgres.dump"

echo "==> mirror 纹理卷"
docker run --rm -v mythicove_mirrordata:/data:ro -v "$DEST":/backup alpine \
  tar czf /backup/mirror-textures.tar.gz -C /data .

echo "==> hoard 文件卷"
docker run --rm -v mythicove_hoarddata:/data:ro -v "$DEST":/backup alpine \
  tar czf /backup/hoard-files.tar.gz -C /data .

echo "==> 校验和"
( cd "$DEST" && sha256sum ./* > SHA256SUMS )

echo "==> 清理 $RETENTION_DAYS 天前的备份"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo "完成：$DEST"
