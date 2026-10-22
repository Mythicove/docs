# ADR-0002 OpenAPI 契约优先

- 状态：已接受
- 日期：2026-10-22

## 背景

后端 Go、前端 TS 是两套语言，若各自手写类型，极易漂移。需要一个单一事实源（single source of truth）同时驱动两端。

## 决策

- 所有 API 以 **OpenAPI 3.1** 描述，存放在独立仓库 `Mythicove/api`（`specs/` 下每产品一个文件 + `common.yaml` 公共模型）。
- **生成方向**：`oapi-codegen` 生成 Go server 类型，`openapi-typescript` 生成 TS client；生成物由 CI 从本仓库产出。
- **改契约 = 改 spec**，两端生成物不手写。

## 理由

- 契约是跨语言唯一的真相，避免 Go/TS 类型不一致导致的运行时 bug。
- 便于第三方（启动器、工具）消费：Yggdrasil/Modrinth 兼容本身就是一个公开契约。
- 生成物可版本化、可回归，CI 能发现契约破坏。

## 后果

- 正：类型一致锁死；契约可独立评审、独立测试。
- 负：需要维护 codegen 流水线；生成物提交策略（进仓库 vs CI 临时生成）需在 CI 落地时定案。
- 注意：Modrinth 兼容 API 保持 JSON 字段名与上游完全一致，spec 以对齐为准（见 mythic-hoard 计划）。
