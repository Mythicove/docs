---
title: 安装 Compass（Windows / macOS / Linux）
description: 三平台安装、未签名包的绕行、便携模式、命令行参数与排障入口
---

Compass 是 Mythicove 的 Minecraft 启动器：原生启动、实例与整合包管理、mod 依赖检查，
对接 Mythic Mirror 的皮肤站与账号体系。

## 下载与校验

从 [Releases](https://github.com/Mythicove/mythic-compass/releases) 取对应平台的安装包，
同一个 release 里有一份 `SHA256SUMS.txt`。核对：

```bash
# Linux
sha256sum -c SHA256SUMS.txt --ignore-missing
# macOS（与清单中对应文件的摘要比较，使用实际下载的文件名）
shasum -a 256 ./Mythic-Compass.dmg
# Windows（PowerShell）
Get-FileHash .\Mythic-Compass_0.x.0_x64-setup.exe -Algorithm SHA256
```

## Windows

产物是 NSIS 安装包（`*-setup.exe`），装给**当前用户**（不弹 UAC），开始菜单里建
`Mythic Compass` 文件夹。也有 MSI 备选。当前 CI 构建 x64。

### SmartScreen 的"未知发布者"

当前 Windows 构建流程未配置代码签名。首次运行可能出现 SmartScreen「未知发布者」提示：

1. 点「更多信息」
2. 点「仍要运行」

请确认下载来自官方 release，并核对上面的 SHA256。

### 杀毒软件误报

未签名的、会下载并执行 Java 子进程的程序，是启发式引擎最爱报的一类。若被隔离：

- 先按上面的方法核对 SHA256；一致就把安装目录加入白名单。
- 数据目录默认在 `%APPDATA%\com.mythicove.compass`。被杀软删掉里面的 `cache/libraries`
  会让启动报 `ClassNotFoundException`——那**不是** mod 的问题，是库文件没了，重装该版本即可。

### 路径长度

Minecraft 的库路径很长（`cache/libraries/net/neoforged/…`），加上较深的实例目录可能超过
Windows 的 260 字符限制。若安装或启动报"文件名或扩展名太长"：

- 通过组策略 `计算机配置 → 管理模板 → 系统 → 文件系统 → 启用 Win32 长路径`
  开启系统长路径支持；
- 或者用便携模式（见下）把数据目录放到一个短路径，例如 `D:\mc\`。

## macOS

产物是 `.dmg`。当前 CI 在 Apple Silicon runner 上构建 arm64。

### Gatekeeper

配齐 Apple 密钥后发布的是 Developer ID 签名 + 已公证的包，双击即可。若拿到的是
**未签名**包，系统可能拦截首次打开，可以：

1. 在 Finder 里**右键**（或 Control+点击）`Mythic Compass.app` → 「打开」
2. 在弹出的对话框里再点一次「打开」

之后就能正常双击了。若仍被拒，去 `系统设置 → 隐私与安全性`，页面下方会出现
「仍要打开」的按钮。

### 其它

- **应用支持目录**：数据在 `~/Library/Application Support/com.mythicove.compass`。
- **磁盘访问（TCC）**：把实例放在「文稿」「桌面」「下载」等受保护目录时，首次访问会弹
  授权框。拒绝之后症状是"实例列表是空的"或"读不到存档"，去
  `系统设置 → 隐私与安全性 → 文件与文件夹` 里补上。
- 渲染在第一线程（`-XstartOnFirstThread`）由启动器自动加：1.16 及更早的版本需要显式传，
  1.17+ 的版本 JSON 自带该规则，两种情况都已处理，不需要手动配置。

## Linux

当前 Linux x64 构建目标包含 AppImage、deb、rpm，以 release 实际上传的产物为准。

### AppImage 与 FUSE

部分发行版（以及容器里）没有 FUSE，AppImage 会报
`dlopen(): error loading libfuse.so.2`。两条路：

```bash
# 装 FUSE（Debian/Ubuntu）
sudo apt install libfuse2
# 或者不解压挂载，直接跑
./Mythic-Compass.AppImage --appimage-extract-and-run
```

### deb/rpm 依赖

deb 包已声明 `libwebkit2gtk-4.1-0`、`libgtk-3-0`、`libayatana-appindicator3-1`。
自行编译时需要的是 `webkit2gtk-4.1` 的**开发**包（注意是 4.1，不是 4.0）。

## 便携模式

在可执行文件旁边建一个空的 `portable.txt`，数据目录就变成同级的 `data/`：

```
Compass/
├── Mythic Compass.exe        # 实际可执行文件
├── portable.txt              # 内容不重要，空文件即可
└── data/                     # 实例、缓存、配置、令牌全在这里
    ├── compass.json
    ├── accounts.json
    ├── secrets.json
    └── instances/
```

用途是放进 U 盘或云同步目录带着走。判断只看那个标记文件在不在，与安装位置无关
（装在 `Program Files` 里也能开，只是那样多半写不进去）。

标记文件必须位于实际运行的二进制旁边。macOS 的二进制在 `.app/Contents/MacOS/` 内；
AppImage 运行时通常位于只读挂载目录，不能直接套用上述同级文件布局。

**注意** `data/secrets.json` 里是**明文**的登录令牌（Unix 权限 0600）。放进云同步目录
等于把令牌同步上去；接入系统钥匙串之前请先知道这一点——设置页里也会照实写着。

## 命令行参数

```
compass --instance <slug> --launch     # 直接启动某个实例
compass --instance <slug>              # 打开实例页
compass --import <pack.mrpack>         # 打开导入确认框
compass <pack.mrpack>                  # 同上（双击 .mrpack 走的就是这条）
```

- `--instance=` 与 `--instance ` 两种写法都认，`-i` / `-l` 是短写。
- **打错的参数会被显示出来**，不会被静默忽略：`--lauch` 会让界面提示
  "无法识别的命令行参数"，而不是让你以为它生效了、然后去查游戏为什么没启动。
- 位置参数只认 `.mrpack`。`.zip` **不会**被当成整合包——一个 zip 也可能是 mod、
  资源包或存档，猜错的后果是把存档当整合包解开。
- 双击 `.mrpack` 不会直接导入：仍然会先只读地看一眼（有哪些文件、要叫什么名字），
  确认之后才解压落盘。一次双击就写几十个文件并下载几百 MB 是不该默认发生的。

## Java

启动器按游戏版本清单挑 Java：旧版使用 Java 8，1.17 使用 Java 16，1.18–1.20.4 使用 Java 17，
1.20.5 起使用 Java 21。本机没有合适的就自动下载 Mojang 官方运行时（大小依版本而异，有进度），
装进 `cache/java/`，按 sha1 逐个文件校验。

**两个平台没有官方运行时**，此时不会下载，设置页会直接说明并请你手动指定路径：

- **Linux arm64**：Mojang 的清单里整个平台都不存在（只有 `linux` 与 `linux-i386`）。
- **Apple Silicon**：没有官方的 Java 8 / 16（`jre-legacy`、`java-runtime-alpha`、
  `java-runtime-beta` 都是空的），Java 17 与 21 有。所以要在这台机器上玩 1.12.2，
  得自己装一个 arm64 的 JDK 8（如 Zulu 8）并在实例设置里指定。

设置页的「Java」一节会列出本机探测到的每一个 JRE（**都真跑过 `java -version`**，
不是只看路径存在），以及这个平台上可下载的官方运行时。注意产品名与 Java 版本
不是一一对应：`java-runtime-gamma` 现在是 17，21 是 `java-runtime-delta`，所以要看版本号那一列。

## 从社区网站安装整合包

在服务器详情页下载已发布的 `.mrpack`，用 Compass 打开。启动器先展示包信息，确认后才安装。
也可以在实例页选择「导入整合包」，打开下载的文件。

启动页会按实例的 Java 服务器地址匹配公开目录，展示有新鲜 Bridge 心跳支持的允许协议版本。
没有匹配记录或心跳已过期时，兼容情况保持未知。协议提示只描述服务器允许的协议，
整合包、代理和认证兼容性仍需分别确认。

## 排障

三样东西，都在设置页与日志页里能拿到：

1. **日志页的「崩溃诊断」**：它读最新的崩溃报告，没有就读 `logs/latest.log`，
   然后给出「发生了什么 + 该怎么办」，能一键跳走的会带按钮。每条结论都附上
   **命中的原文行**，你可以自己核对。
2. **日志页的「启动器操作日志」**：启动器自己做了什么（装了哪个版本、用什么 Java、
   退出码是多少）。"还没跑起来"那类失败根本没有游戏日志，能说明过程的只有这份。
   里面没有任何机密。
3. **实例的 `logs/` 目录**：完整日志与历史滚动归档（`.log.gz`），日志页里可以直接查看，
   也能「打开目录」。

几个容易被误判的：

- 日志里出现 `Failed to fetch user properties` + `Status: 401`：用我们镜像站的账号时
  **这是预期的**（游戏在跟 Mojang 的服务说话，而它不认镜像站的令牌），游戏照常进行。
- 界面上什么错误都没有、但某个 mod 不生效：去日志页看诊断。现代 Forge/NeoForge 对
  混装的、或版本不符的 mod 是**跳过并继续启动**，只在日志里留一条 WARN/ERROR。
- 启动后进程不退、也没有窗口：Fabric 的 mod 解析失败会弹一个 GUI 错误框并**挂住**，
  不会退出。看日志页的实时输出，那里有 `Mod resolution failed` 与具体原因。

## 镜像源

设置页可以填一个 BMCLAPI 兼容的镜像地址，资源与库会改走它。官方 CDN 在部分地区很慢或
被限流时才需要。留空就是官方源。

镜像只影响资源与库的**下载来源**，不影响校验：每个文件都按官方清单给的 sha1 核对，
不一致就丢弃、不落盘。
