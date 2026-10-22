# ADR-0009 代码生成工作流

- 状态：已接受
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
