---
title: 架构决策记录（ADR）
---

按序记录 Mythicove 生态的重要架构决策。每个 ADR 描述**背景 → 决策 → 后果**，便于后来者理解"为什么这么做"。

| 编号 | 标题 | 状态 |
|---|---|---|
| [ADR-0001](./adr-0001-language.md) | 后端 Go + 前端 TypeScript | 已接受 |
| [ADR-0002](./adr-0002-openapi-contract.md) | OpenAPI 契约优先 | 已接受 |
| [ADR-0003](./adr-0003-capability-layers.md) | 能力分层与部署分级 | 已接受 |
| [ADR-0004](./adr-0004-license.md) | 许可证策略 | 已接受 |
| [ADR-0005](./adr-0005-shared-go-module.md) | 共享 Go 代码组织 | 已接受 |
| [ADR-0006](./adr-0006-i18n.md) | 国际化（i18n）方案 | 已接受 |
| [ADR-0007](./adr-0007-auth-design.md) | 认证设计 | 已接受 |
| [ADR-0008](./adr-0008-rsa-key-management.md) | Yggdrasil RSA 签名密钥管理 | 已接受 |
| [ADR-0009](./adr-0009-codegen-workflow.md) | 代码生成工作流 | 已接受 |
| [ADR-0010](./adr-0010-oidc-login-methods.md) | OIDC Provider 与登录方式注册表 | 已接受 |
| [ADR-0011](./adr-0011-identity-architecture.md) | 身份架构：Mirror 为唯一 IdP，其余产品做 OIDC RP + 投影表 | 已接受 |
| [ADR-0012](./adr-0012-credential-separation.md) | 凭证分离：网站主密码与启动器独立密码 | 已接受 |

> 格式参照 [MADR](https://adr.github.io/madr/) 简化版；新决策追加 `adr-NNNN-<slug>.md`（文件名小写，GitHub Pages 区分大小写），并在上表补一行。
