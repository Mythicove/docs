---
title: 发布 Compass（签名、公证与自动更新）
description: 发布流程、CI 密钥清单，以及更新签名私钥的生成、保管与丢失后果
---

面向发布者。用户视角的安装说明在[安装指南](/guides/compass-install/)。

## 发布流程

```
打 tag（v0.x.y）
  → CI 的 package 作业在三平台构建
  → 若配齐更新公私钥：产出各产物 + .sig + latest.json
  → 若有 Apple 密钥：dmg 走 Developer ID 签名 + 公证
  → 全部平台上传成功后，下载 release 资产计算统一的 SHA256SUMS.txt
  → release 是 draft，人工核对后发布
```

发布前同步修改 `package.json`、`src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml` 的版本，
并更新锁文件。当前配置分别保留版本号，CI 的 `__VERSION__` 使用 Tauri 配置中的版本。

`package` 作业只在**打 tag** 或手动 `workflow_dispatch` 时跑；手动跑出来的 tag 是
`dev-<run number>`，用来人工验包，不该发布给用户。

## CI 密钥清单

全部是 GitHub Actions 的 repository secrets。更新公私钥都不配置时，构建普通安装包；
只配置其中一个会明确失败。Apple 签名或公证的部分配置也可能使对应步骤失败。

| Secret | 用途 | 缺了会怎样 |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 更新包签名（minisign 私钥） | 与公钥都缺失时不启用更新；只缺这一项时构建失败 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 上面那把私钥的口令 | 同上（有口令却不给，签名步骤会失败） |
| `TAURI_SIGNING_PUBLIC_KEY` | 通过 CLI `--config` 注入公钥并启用更新产物 | 与私钥都缺失时界面说明未配置更新；只缺这一项时构建失败 |
| `APPLE_CERTIFICATE` | Developer ID 证书（.p12 的 base64） | dmg 未签名，用户要"右键打开" |
| `APPLE_CERTIFICATE_PASSWORD` | 上面那个 .p12 的口令 | 证书导入失败 |
| `APPLE_SIGNING_IDENTITY` | 签名身份（如 `Developer ID Application: …`） | 同上 |
| `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | 公证 | 未公证，首次打开会被 Gatekeeper 拦得更死 |

Windows 目前未配置代码签名。接入签名服务时，先确认项目许可是否符合服务的申请条件，
再按 Tauri 的 Windows 签名配置接入，并更新安装指南。

## 更新签名密钥：怎么生成、怎么保管

自动更新用的是 minisign。**公钥在构建时注入，私钥只在 CI 里出现**——仓库里的
`tauri.conf.json` 故意不带 `plugins.updater` 段，因为一个占位公钥会让 `check()`
在运行时失败，而那个错误看起来像网络问题。

生成（**在发布者自己的机器上，不要在任何会被记录的地方**）：

```bash
pnpm tauri signer generate -w ~/.tauri/compass-updater.key
```

它会输出一对密钥。然后：

- **私钥**（`~/.tauri/compass-updater.key` 的内容）→ `TAURI_SIGNING_PRIVATE_KEY`
- **口令**（生成时自己设的）→ `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **公钥**（输出里那一行 base64）→ `TAURI_SIGNING_PUBLIC_KEY`

生成完把本地那份私钥放到离线介质上，然后从工作机删掉。

### 丢失私钥 = 无法再发布更新

这不是"重新生成一把就行"那么轻：已经装在用户机器上的那些包，内置的是**旧公钥**，
它们只认旧私钥签出来的更新。私钥丢了之后：

- 老用户**永远不会**收到自动更新（`check()` 会拿到一份验签失败的 `latest.json`，
  或者干脆没有 `latest.json`）；
- 唯一的出路是让他们手动下载新包重装，而新包里带的是新公钥；
- 也就是说，丢私钥等于把整个已安装用户群从更新通道上摘掉。

所以：离线备份，至少两份，分开存放。这条与 ADR-0008 对 RSA 密钥的要求同级。

### 轮换密钥

当前 updater 配置接受单个公钥。轮换时，先用旧私钥签署一版内置新公钥的启动器；
这一版安装完成后才能接收新私钥签署的后续更新。尚未升级的旧客户端仍需旧密钥通道，
或手动下载重装。切换发布通道前实际验证旧版本 → 过渡版 → 新版本的升级过程。

## 未签名 Windows 包的现实

未签名会带来两件持续的事，都写进了安装文档，不要指望用户自己撞明白：

1. SmartScreen 每次大版本都可能重新拦（信誉是按文件哈希累积的）。
2. 杀软启发式更容易报。Compass 会下载并执行 Java 子进程、写用户目录、
   解压 natives——这套行为本身就在启发式的敏感区里。

签名能把这两件都压下去，这也是"先发未签名、之后接 SignPath"这个决定要复评的触发条件：
如果误报或 SmartScreen 的反馈开始占支持量的明显比例，就该接签名了。

## 发布前的人工核对清单

CI 出的是 draft release，发布前过一遍：

- [ ] 当前构建矩阵的产物都在（Windows x64 exe/msi、macOS arm64 dmg、Linux x64 AppImage/deb/rpm）
- [ ] `SHA256SUMS.txt` 在，且条目数与产物数对得上
- [ ] 若这一版应该有自动更新：每个可更新产物都有配对的 `.sig`，且 `latest.json` 在
- [ ] macOS 产物是已签名 + 已公证的（`spctl -a -vvv -t install <dmg>` 或看 CI 日志里的公证步骤）
- [ ] 在一台**干净**机器上按安装文档走一遍：下载 → 安装 → 首次启动 → 登录 → 装版本 → 进游戏，
      全程不需要命令行、不需要预先装 Java
- [ ] 从上一个已发布版本升级一次，确认自动更新真的走通（这是 P5-W15 的验收条件）

最后两条是计划里 P6 的验收原文，也是最容易被跳过的两条——而"陌生人能不能装上"
恰恰只有它们能回答。
