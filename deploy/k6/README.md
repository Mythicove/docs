# k6 压测基线

两个脚本覆盖核心路径，阈值即 SLO 草案（超过即 fail）：

| 脚本 | 路径 | 负载 | 阈值 |
|---|---|---|---|
| `skinlib-read.js` | 列表（搜索/排序/分页）→ 详情 | 20→50 VU 梯度，~2 分钟 | p95 < 500ms，错误率 < 1% |
| `upload-write.js` | 登录 → 上传皮肤 → 发布（setup 经 mailpit 播种已验证账号） | 5 VU 恒定，1 分钟 | p95 < 1.5s，错误率 < 2%，检查通过率 > 95% |

## 运行

栈按 `web/e2e/README.md` 起（mirror:18080 + mailpit:8025 + PG）。写脚本需要 `skin.png`（同目录）。

```powershell
cd docs/deploy/k6
docker run --rm -v ${PWD}:/k6 -w /k6 grafana/k6 run skinlib-read.js -e BASE=http://host.docker.internal:18080
docker run --rm -v ${PWD}:/k6 -w /k6 grafana/k6 run upload-write.js -e BASE=http://host.docker.internal:18080 -e MAILPIT=http://host.docker.internal:8025
```

生产验收时在目标硬件重跑并把数字记入下表（附机器规格）。

## 基线记录

### 2026-10-23 · 开发机（Windows / Docker Desktop，mirror 单副本 + Postgres 17 本地容器，local 存储驱动）

| 脚本 | 结果 | 延迟 | 吞吐 | 错误 |
|---|---|---|---|---|
| `skinlib-read.js`（20→50 VU，1m50s） | ✅ 阈值全过 | p95 = **4.5ms**（med 2.8ms，max 68ms） | 52 req/s，2883 迭代 | 0.00%（5766 请求） |
| `upload-write.js`（5 VU，1m） | ✅ 阈值全过，checks 100%（840/840） | p95 = **63ms**（med 15ms，max 120ms；含 bcrypt 登录 + PNG 上传 + 发布） | 13.5 req/s，280 迭代 | 0.00%（860 请求） |

说明：读路径 p95 < 5ms（PG 查询 + 进程内缓存）；写路径大头在登录 bcrypt 与上传校验，发布走 sha256 去重（同图仅计一次配额）。生产验收时在目标硬件重跑并另起一行记录（附机器规格与副本数）。
