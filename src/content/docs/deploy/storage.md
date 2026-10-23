---
title: 存储分级
description: 本地磁盘 → MinIO → S3 + CDN
---

所有文件都藏在 `Storage` 接口后面，按规模换实现，不改业务代码。

## 接口

```go
type Storage interface {
    Put(ctx, Object) (key string, err error)
    Get(ctx, key) (io.ReadCloser, error)
    Delete(ctx, key) error
    PresignGet(ctx, key) (*url.URL, error)
}
```

## 分级

| 层级 | 实现 | 配置 |
|---|---|---|
| A（本地盘） | `local` | `MIRROR_STORAGE_DRIVER=local` / `HOARD_STORAGE_DRIVER=local` |
| B+（MinIO/R2/S3） | `s3` | `MIRROR_STORAGE_DRIVER=s3` + `MIRROR_S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY/SECRET_KEY` |

S3 驱动覆盖所有 S3 兼容服务商（MinIO / R2 / AWS / OSS / COS 等），仅靠 Endpoint/Region 区分。

## 直出 URL

- 本地：`{baseURL}/textures/{key}`（Mirror）/ `{baseURL}/cdn/{key}`（Hoard）。
- S3：配置 `baseURL`（CDN 域名）时直接拼接，否则生成 15 分钟预签名 URL。

## CDN 刷新

上传新纹理后调用 `cdn.CDN` 刷新缓存：Cloudflare / Bunny / 通用 Webhook，按 `MIRROR_CDN_DRIVER` 选择。
