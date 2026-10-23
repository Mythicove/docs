# ADR-0009 代码生成工作流

- 状态：已接受（2026-10-23 修订，见文末）
- 日期：2026-10-22

## 背景

契约优先（ADR-0002）：spec 在 `api` 仓库，生成 Go server（`oapi-codegen`）与 TS client（`openapi-typescript`）。需决定生成物是否提交、如何同步。

## 决策

- **生成物提交进产品仓库**的 `gen/` 目录（Go）与 `src/gen/`（TS），便于 IDE 与 diff 评审。
- 产品仓库 `make generate` 从 `api` 仓库**按固定 tag/commit 下载 spec**（不做 submodule），运行 oapi-codegen / openapi-typescript。
- CI 加 **drift 检查**：`make generate && git diff --exit-code`，保证 spec 与生成物一致。

## 后果

- 正：提交生成物给 DX 与 diff 评审；CI 兜底同步。
- 负：spec 变更需更新 pin + 重新生成；生成物 diff 会进入 PR，约定"评审只看 spec、不看生成物"。

## 修订（2026-10-23）

原决策落地一半就停在纸面：`make generate` 长期是 `TODO: oapi-codegen`，前端类型全部手写，spec 与实现漂移（`/avatar` vs `/avatars`、hoard 九个幽灵端点）。实际采用如下，替换原决策中未落地的部分：

- **TS 侧采用 openapi-typescript**：`web` 仓库 `pnpm gen:api`（`scripts/gen-api.mjs`）从 `../api/specs` 生成到 **`src/lib/api-schema/`**（不是 `src/gen/`），提交进仓库；CI `gen:api && git diff --exit-code` 兜底。`web/src/lib/api.ts` 的类型改为从生成物 re-export，不再手写。
- **Go 侧不引入 oapi-codegen server**：全量改造 handler 去实现生成的 `ServerInterface` 成本高、风险大。改为在每个 Go 服务加 **spec↔路由漂移测试**（`TestSpecMatchesRoutes`）：解析契约里声明的每个 `METHOD /path`，断言都真实注册在 chi 路由上；找不到契约文件则 skip，CI 通过 checkout `Mythicove/api` + `MYTHICOVE_API_SPECS` 打开这道门。
- **契约只描述已实现路由**：hoard spec 删除未实现的 Modrinth 批量/依赖/用户/团队端点，补上真实的 `/api/mods*` 与 mrpack；实现后再按 ADR-0002 增补。
- **spec 来源**：CI 直接 checkout `Mythicove/api` 默认分支（暂不做 tag pin）。多仓库同级 checkout 时 Go 漂移测试自动在 `../api/specs` 找契约。

后果修正：生成物只在 TS 侧；Go 侧用"契约声明的端点必须存在"这条更弱的门替代"生成物一致"，代价是不校验请求/响应 schema 的字段级一致（留给后续 oapi-codegen 或契约测试）。
