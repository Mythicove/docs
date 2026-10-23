# 可观测性

## Prometheus 抓取配置（prometheus.yml 片段）

```yaml
scrape_configs:
  - job_name: mirror
    static_configs:
      - targets: ["mirror:8080"]   # /metrics
  - job_name: hoard
    static_configs:
      - targets: ["hoard:8081"]
rule_files:
  - alerts.yml
```

> `/metrics` 目前无鉴权：不要把 8080/8081 直接暴露公网（compose 里它们只在内部网络，仅 Caddy 暴露 API 路径）。若要公网抓取，走 Prometheus agent 或在 Caddy 上加 basic_auth 的独立站点。

## 告警规则

[`alerts.yml`](./alerts.yml)：服务不可达、5xx 比例、P95 延迟、429 激增、崩溃循环。

## Grafana

导入 [`grafana-dashboard.json`](./grafana-dashboard.json)：请求速率、错误比例、P95 延迟、429 速率四块面板，按 `job` 区分 mirror/hoard。

## 后续（未做）

- Postgres：接 `postgres_exporter`（连接数/事务/锁/复制延迟告警）
- Caddy：开启 `metrics` 指令后抓反代层 502/上游延迟
- 追踪：暂无（单二进制规模下 metrics+结构化日志够用）
