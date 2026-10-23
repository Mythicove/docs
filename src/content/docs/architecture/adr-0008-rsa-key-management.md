---
title: ADR-0008 Yggdrasil RSA 签名密钥管理
---

- 状态：已接受
- 日期：2026-10-22

## 背景

Minecraft 1.19+ 要求 Yggdrasil 服务端用 RSA 私钥对 profile 的 `textures` 属性签名，客户端用根 meta 端点暴露的公钥校验。

## 决策

- 密钥对在**初始化时生成**（RSA-2048，可上 3072/4096）；私钥存文件/环境变量/KMS，**绝不进仓库**。
- 根 `GET /` meta 返回 `signaturePublickey`（base64 PEM）；签名值写入 profile 属性 `signature`（base64）。
- **轮换**：v1 单密钥对，通过更换配置 + 重启生效；预留 key id 字段，后续做优雅轮换。
- 公钥编码与签名格式在 M1 实现时以 authlib-injector 文档 + yggdrasil-mock 逐位对齐。

## 后果

- 正：满足 1.19+ 客户端校验，私钥与代码隔离。
- 负：轮换期间客户端需重新拉 meta；暂不做多密钥并存。
