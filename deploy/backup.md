# 备份与恢复 Runbook

## 备份什么

| 数据 | 位置 | 方式 |
|---|---|---|
| Postgres（账号/皮肤库元数据/mod 元数据/settings） | `pgdata` 卷 | `pg_dump --format=custom` |
| 皮肤纹理 + RSA 私钥 | `mirrordata` 卷（`/data`） | tar.gz |
| mod 文件 | `hoarddata` 卷（`/data/files`） | tar.gz |

> `mirrordata` 里的 `private.pem` 是 profile 签名私钥（ADR-0008）：**丢了它，所有已进服玩家的皮肤签名验证会失败**，必须随备份保留。

## 定时备份

```bash
# 每日 03:00，保留 14 天
0 3 * * * cd /opt/mythicove && BACKUP_DIR=/var/backups/mythicove ./docs/deploy/backup.sh >> /var/log/mythicove-backup.log 2>&1
```

脚本：[`backup.sh`](./backup.sh)（compose 栈运行中执行；产物含 SHA256SUMS）。
备份产物应再同步到异地（rclone/restic 到 S3 等），本机备份不防灾。

## 恢复

```bash
# 1. 起空栈（只 db）
docker compose up -d db

# 2. 恢复 Postgres
docker compose exec -T db pg_restore -U mirror -d mirror --clean --if-exists < /var/backups/mythicove/<stamp>/postgres.dump

# 3. 恢复文件卷（卷名带 compose 项目前缀，默认=目录名；用 docker volume ls 确认）
docker run --rm -v mythicove_mirrordata:/data -v /var/backups/mythicove/<stamp>:/backup alpine \
  sh -c 'cd /data && tar xzf /backup/mirror-textures.tar.gz'
docker run --rm -v mythicove_hoarddata:/data -v /var/backups/mythicove/<stamp>:/backup alpine \
  sh -c 'cd /data && tar xzf /backup/hoard-files.tar.gz'

# 4. 起全栈并验证
docker compose up -d
curl -sf http://localhost:8080/healthz    # 统一入口网关（mirror 的 /healthz，经 Caddyfile 分流）
# hoard 不发布宿主端口，只能在容器内探：
docker compose exec hoard wget -qO- http://127.0.0.1:8081/healthz
```

## 恢复演练

备份不做恢复演练等于没有备份。建议每次大版本升级前：在临时目录用最近一次备份走一遍恢复流程，验证 `healthz` + 登录 + 皮肤可见。
