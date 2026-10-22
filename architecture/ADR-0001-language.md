# ADR-0001 后端 Go + 前端 TypeScript

- 状态：已接受
- 日期：2026-10-22

## 背景

立项动机之一是摆脱 Blessing Skin 的 PHP 8.1 EOL 风险，同时 UI 要现代化。需在「TS 全栈」与「Go 后端 + TS 前端」之间抉择。目标规模从 10 人到 10k 人，且强调自托管友好。

## 决策

- **后端用 Go**（chi + pgx + sqlc），**前端/渲染用 TypeScript**（Next.js/Vite + React + skinview3d）。
- 前后端通过 OpenAPI 契约 + codegen 锁类型一致（见 ADR-0002）。

## 理由

- Go：单静态二进制、低内存、goroutine 高并发，天然适合"自托管 + 长跑 + 上万用户"；MC 后端工具链（chrly/go-mc/packwiz/mrpack-install）同为 Go，可参考现成实现。
- TS：3D 预览（skinview3d）、crafatar 逻辑、Modrinth 客户端生态全在 TS，前端没有替代；招人/AI 生产力最高。
- 10k 用户是 IO 密集负载（几十~几百 RPS），语言性能差异是噪音，真正决定上限的是架构（见 ADR-0003）；此时语言选型按"运维成本 + 生态复用"而非"性能"取舍。

## 后果

- 正：低内存自托管、单二进制部署、生态复用。
- 负：两套语言；用 OpenAPI codegen 与 `shared` 模块（ADR-0005）缓解。
- 负：认证缺 TS 的 Better Auth 级开箱货，用内建 JWT/session + 可选 Zitadel 补偿（见 ADR-0003）。
