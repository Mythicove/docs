# Mythicove Docs

Mythicove 生态的统一文档仓库。所有跨仓库、或"开发过程中需要版本化"的文档统一放这里，不散落到各产品仓库的随机子目录。

## 约定

| 放这里（`docs`） | 放产品仓库 | 放 `api` 仓库 | 不进仓库 |
|---|---|---|---|
| 产品计划、架构决策记录（ADR）、部署/运维文档、团队规范 | 与代码强绑定的 `README`、`CONTRIBUTING`、`CHANGELOG`、代码内注释 | API 契约（OpenAPI） | 一次性草稿、密钥、环境相关本地文件 |

## 目录

- `plans/` — 产品计划
  - `overview.md` — 生态总览（命名、技术栈、部署分级）
  - `mythic-mirror.md` — 皮肤站计划
  - `mythic-hoard.md` — Mod 托管计划
- `architecture/` — 架构决策记录（ADR，待建）
- API 契约 → 独立仓库 `Mythicove/api`

## 许可证

文档采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。
