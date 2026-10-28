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

# compose 卷名带项目前缀（默认 = compose 文件所在目录名），不能硬编码 mythicove_*。
# 解析失败必须立刻退出：卷名写错时 `docker run -v <名字>:/data` 会**新建一个空卷**，
# 备份出一个空 tar.gz 还算成功 → 静默丢数据。
# 前缀不确定（多套栈共存）时用 MIRROR_VOLUME / HOARD_VOLUME 显式指定。
resolve_volume() {
  local suffix="$1" pinned="${2:-}" matches count
  if [ -n "$pinned" ]; then
    docker volume inspect "$pinned" >/dev/null || {
      echo "错误：指定的卷不存在：$pinned" >&2; exit 1; }
    echo "$pinned"
    return
  fi
  matches="$(docker volume ls --format '{{.Name}}' | grep -E "_${suffix}$" || true)"
  count="$(printf '%s\n' "$matches" | grep -c . || true)"
  if [ "$count" -eq 0 ]; then
    echo "错误：找不到以 _${suffix} 结尾的卷（栈没起来？项目前缀不同？）" >&2
    echo "      现有卷：$(docker volume ls --format '{{.Name}}' | tr '\n' ' ')" >&2
    echo "      可用 MIRROR_VOLUME / HOARD_VOLUME 显式指定卷名。" >&2
    exit 1
  fi
  if [ "$count" -gt 1 ]; then
    echo "错误：以 _${suffix} 结尾的卷有多个，无法确定用哪一个：" >&2
    printf '%s\n' "$matches" >&2
    echo "      请显式指定（如 MIRROR_VOLUME=mythicove_mirrordata）。" >&2
    exit 1
  fi
  echo "$matches"
}

MIRROR_VOLUME="$(resolve_volume mirrordata "${MIRROR_VOLUME:-}")"
HOARD_VOLUME="$(resolve_volume hoarddata "${HOARD_VOLUME:-}")"
echo "==> 卷解析：mirror=$MIRROR_VOLUME hoard=$HOARD_VOLUME"

echo "==> Postgres dump"
docker compose exec -T db pg_dump -U mirror -d mirror --format=custom --compress=9 > "$DEST/postgres.dump"

echo "==> mirror 纹理卷"
docker run --rm -v "$MIRROR_VOLUME":/data:ro -v "$DEST":/backup alpine \
  tar czf /backup/mirror-textures.tar.gz -C /data .

echo "==> hoard 文件卷"
docker run --rm -v "$HOARD_VOLUME":/data:ro -v "$DEST":/backup alpine \
  tar czf /backup/hoard-files.tar.gz -C /data .

echo "==> 校验和"
( cd "$DEST" && sha256sum ./* > SHA256SUMS )

echo "==> 清理 $RETENTION_DAYS 天前的备份"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo "完成：$DEST"
