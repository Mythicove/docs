---
title: Compass 启动器开发计划
---

- 日期：2026-10-27
- 状态：已批准，待开工
- 取代：[当前进度](/plans/status/)的 Phase 4 第 2 条（"Compass 原生启动或先做 Prism 账号深度集成"）。该条只给了方向，本文给出阶段/任务/验收。
- 目标：**Compass 自己把 Minecraft 拉起来**，并逐步补齐 HMCL/PCL 的功能面（实例管理、mod 与整合包、多账号、崩溃诊断、自动更新、三平台打包）。在此之前不再宣传"启动器可用"。

## 现状基线（开工前的事实）

- `mythic-compass` 仓：Tauri 2 脚手架 + 单页 React（`src/App.tsx` 约 5.1KB、`src-tauri/src/lib.rs` 约 1.2KB），Rust 侧只有两个命令：`download_file`（存到当前目录）与 `launch`（**执行任意 program + args**）。
- 启动实际委托 Prism Launcher（`.mrpack` + `--import`），自身不解析版本、不下载资源、不注入 authlib-injector。
- 登录已按 ADR-0012 改为**玩家名 + 该玩家的独立密码**；accessToken 存在 webview 的 `localStorage`（比 web 的 httpOnly cookie 弱）。
- **无 CI**、无自动更新、无多平台打包。（`dist/` 有 74 万字节构建产物躺在工作树里，但**已在 `.gitignore` 中、并未进版本库**——计划初稿把这条记错了，P0 无需处理。）
- 后端就绪：Mirror 提供 Yggdrasil 全套 + 皮肤/披风 + `/` meta（含 `skinDomains`、`signaturePublickey`）；Hoard 提供 Modrinth 兼容 API 与 `.mrpack` 导出。

## 前置决策（各 Phase 的前提，先定死再动手）

1. **技术栈沿用 Tauri 2 + Rust 核心 + React 前端。** 不换 JavaFX（HMCL 路线，体积与观感差）也不换 Electron（内存与体积）。理由：仓库已在 Tauri 上、三平台一份代码、单包体积个位数 MB、下载/解压/进程管理本来就要写系统层代码，Rust 是顺手的选择。**代价**：Rust 侧要自己实现版本解析与参数构造（HMCL 有十几年积累的 Java 生态可直接借用），所以本计划把"参数构造正确性"作为最大的测试投入点。

   **2026-10-27 复核**（用户提出"GPUI 或 Go 写的 Wails 是否更好"后重新评估，结论：维持 Tauri）。实测事实：`tauri` crates.io 稳定 2.x、下载量 3960 万；`gpui` 仅 **0.2.2**、下载量 40 万、仓库即 zed-industries/zed（跟着 Zed 自己的需求演进）；Wails 是 Go + webview（36.7k★），不是 Rust crate。
   - **换框架的成本不在已写的代码**：Rust 核心（下载器、版本 JSON 解析、库/资源规划、Java 探测、安装编排、实例模型）与 UI 框架无关，一行都不用扔；贵的是下面三件事，而这三件 GPUI 都要从零造。
   - **3D 皮肤预览**：skinview3d + three.js 在 webview 里是免费的（已在用）；GPUI 要自己写 wgpu 渲染 + 皮肤贴图 + 旋转动画，Fyne/Gio 的 3D 能力更弱。
   - **控件层**：启动器 90% 的界面是表单/列表/进度条/日志视图/对话框。web 侧有现成组件，且能直接复用 web 站的设计 token 与组件风格（同一批人维护两个前端）；GPUI 没有组件生态。
   - **打包/签名/公证/自动更新**：`tauri-action` + `tauri-plugin-updater` 现成，三平台 CI 已跑通并出过 draft release；GPUI 这条链要自己搭，P5/P6 明显变重。
   - **GPUI 的额外代价**：0.2.x 意味着 API 会随 Zed 变动；文档以 Zed 内部用法为主；无 i18n、无障碍成熟度未知。**而用户看不到收益**——启动器不是代码编辑器，不需要自定义 GPU 渲染管线。它真正合适的场景是"游戏内覆盖层"这类极度自定义的绘制面，将来那一块可以单独用 wgpu，不必换外壳。
   - **Go/Wails 的诱惑与真相**：好处是与后端同语言、能复用 `shared/mc`、交叉编译更省事（不需 MSVC 工具链）。但启动器与后端的**共享面很窄**：只有离线 UUID 派生（`UUID.nameUUIDFromBytes("OfflinePlayer:"+name)`，Rust 侧 20 行等价实现，并用契约测试与 mirror 的输出逐字节对齐——比"共用一个库"更可靠）与几个数据结构。而 Wails 仍然是 webview，三平台不一致的代价一分不少，却少了 Tauri 的 capabilities/更新/打包体系。
   - **Tauri 的真实缺点与缓解**：三平台 webview 不一致，Linux 的 WebKitGTK 最弱（渲染怪癖、WebGL 可能不可用、老发行版版本旧）；多一个 webview 进程约 100~200MB 内存；跨 IPC 调试比同进程麻烦。缓解：UI 不碰前沿 web API；3D 预览走下面的梯队兜底（2026-10-28 修订，取代原"WebGL 不可用降级 2D"单点方案）；安装文档写明 WebKitGTK 版本要求；CI 已有 ubuntu-latest 这条腿。

   **2026-10-28 补充：Linux 体验一致化路径（目标是三平台一致，不是降级）**。Linux 不一致的根源是系统 WebKitGTK 版本随发行版漂移（Debian 12 还在 2.3x，WebGL 靠驱动运气；2.40+ 走 ANGLE 后端基本正常）。四层补全：
   - **Flatpak 钉版本（主渠道）**：GNOME runtime 自带新版 WebKitGTK，宿主发行版是什么版本不再重要；配合 Windows 的 WebView2 evergreen、macOS 的 WKWebView 随系统更新，三平台 webview 版本全部钉死。deb/rpm 作次级渠道，依赖声明写清 WebKitGTK 最低版本；不做 AppImage（捆绑 webkit2gtk 容易在沙箱与 GPU 进程上翻车）。
   - **软件渲染 WebGL（视觉一致的兜底）**：skinview3d 场景极轻（64×64 贴图、单模型、小画布），GPU context 拿不到时强制 llvmpipe 软件渲染重试（`LIBGL_ALWAYS_SOFTWARE=1` / `GALLIUM_DRIVER=llvmpipe`，Mesa 各发行版自带），60fps 无压力，画面与 GPU 路径逐像素相同，只是烧 CPU。启动器是原生进程，能在 webview 初始化前设好环境变量，用户无感——这是 Tauri 壳相对纯 web 的优势。
   - **已知 webview 怪癖自愈**：Tauri 的 Linux 老 issue（#6559 WebGL context lost、#7761 窗口冻结）多指向特定驱动组合且社区已有解法。Rust 侧按检测到的环境自动逐个重试并在日志页记录最终生效的组合：`WEBKIT_DISABLE_DMABUF_RENDERER=1`（NVIDIA + Wayland 白屏/花屏的标准修复）、软件渲染变量等。
   - **3D 预览兜底梯队**（原"降级 2D"方案降为末位）：① GPU WebGL2/1（skinview3d）→ ② 软件 WebGL（同一套代码，逐像素一致）→ ③ CSS 3D（`preserve-3d` 贴图盒子，仍可旋转立体，无 WebGL 依赖）→ ④ mirror 的 `/renders/head`、`/renders/body` 服务端渲染静态图。Flatpak + 梯队②落地后，实际落到③④的用户接近于零。
   - **工程保障**：基线锁最老受支持 WebKitGTK（Ubuntu 24.04 / Debian 12 容器）跑 Playwright-WebKit 冒烟测试进 CI；特性一律 feature-detect，不做 UA 嗅探。
2. **重逻辑放 Rust，前端只做视图。** 版本/资源/库的解析、下载调度、Java 探测、参数拼装、进程管理全部在 Rust；React 通过 `invoke` 取状态、通过 Tauri event 收进度。不在前端拼启动参数（前端拼一次就得在三平台各错一次）。
3. **全局缓存 + 实例隔离。** `assets/objects`、`libraries`、`versions/<id>`（version json + client jar）、`java/`（自动下载的 JRE）、`authlib-injector.jar` 全局共享（按 sha1/Maven 坐标天然去重，多实例不重复下载）；实例只存自己的 `instance.json` + `.minecraft/`（游戏目录：mods/config/saves/resourcepacks/options.txt/logs）。目录布局：
   ```
   <app_data_dir>/com.mythicove.compass/   # Tauri app_data_dir（identifier com.mythicove.compass）：Windows %APPDATA%、macOS ~/Library/Application Support、Linux $XDG_DATA_HOME
     compass.json                          # 全局设置：语言、主题、下载并发与镜像、默认内存（无 Java 列表字段，Java 靠实测探测）
     accounts.json                         # 账号（令牌入系统钥匙串，见 P4）
     cache/{assets,libraries,versions,java,tools}/
     instances/<slug>/{instance.json,.minecraft/}
   ```
4. **下载策略统一一处实现**：并发（默认 32，可配）、失败重试（指数退避）、sha1 与 size 校验、`Range` 断点续传、镜像源可切换（默认官方 `piston-meta.mojang.com` / `resources.download.minecraft.net` / `libraries.minecraft.net`，可选 BMCLAPI 等国内镜像）。**校验失败的文件一律丢弃重下**，不留半截文件（半截 jar 会让游戏以极难诊断的方式崩溃）。
5. **版本兼容范围：1.21.x 优先，向下到 1.7.10。** 覆盖 `arguments`（1.13+）与 `minecraftArguments`（≤1.12）两套参数格式、legacy 资源的 `virtual`/`map_to_resources`、以及 Log4Shell 缓解（1.7~1.18.1 追加 `-Dlog4j2.formatMsgNoLookups=true`）。**不做**：Beta/Alpha 时代（`minecraftArguments` 之前的版本）——HMCL 也只是勉强能跑，投入产出比太差，写进文档而不是偷偷不支持。
6. **验收怎么算**（CI 里没有显示器，不能"点开游戏看看"）：
   - Rust 单元测试为主：版本 JSON 解析、参数构造（用**真实版本 JSON 样本**做契约测试，含 1.21/1.20.1/1.16/1.12/1.7.10 各一份）、Maven 坐标→路径、natives 规则匹配、mrpack/mods 元数据解析。
   - 集成冒烟：真下载 1.21 客户端（assets/libraries 全量）→ 校验 sha1 → **真启动进程**，断言进程存活 >20s、stdout 出现 `Setting user:` 与 `Backend library: LWJGL`、无 `Exception`，然后终止。三平台 CI 各跑一次（Windows/macOS/Linux runner）。
   - 图形界面本身只做人工验收清单（每阶段一条可判定的话，见各 Phase 的"验收"）。
7. **`launch` 命令白名单化（P0 就做）**：删掉"执行任意 program+args"这个命令，改为只能启动"我们自己解析出来的 Java 可执行文件 + 我们自己拼出来的参数"。桌面应用里留一个任意命令执行入口等于给任何 XSS/供应链问题一把本机 shell。委托 Prism 的旧路径在 P1 验收通过后**整条删除**，不保留"两种启动方式"。
8. **明确延后/不做**：OptiFine 与 LiteLoader 安装（小众且各自的补丁机制脆弱）、Technic/FTB 平台整合包、服务器面板/开服（那是 Isles 的范围）、内置浏览器/商店、云端同步设置。CurseForge 整合包需要第三方 API key 且分发条款受限，**放 P3 末尾并标注为可选**。

---

## Phase 0: 骨架与仓库卫生（预计 1 周）

目标：把一个玩具脚手架变成能承载上述架构的工程；CI 从 0 到"每次提交都能出三平台包"。

- **W1**
  - 仓库卫生：`dist/` 移出 git（加 `.gitignore`，`git rm -r --cached`）；`Cargo.toml` 补全元数据（name/description/authors/license 对齐 ELv2）；`tauri.conf.json` 的 identifier/窗口尺寸/最小尺寸定稿。
  - Rust 侧分层：`src-tauri/src/{paths,net,meta,assets,libs,java,args,process,instance,account}/mod.rs`；先落 `paths`（跨三平台数据目录解析，含 XDG 回退）与 `net`（下载器：并发/重试/校验/续传/镜像）两个模块 + 单测。
  - CI：GitHub Actions 三平台（windows-latest / macos-latest(arm) / ubuntu-latest）跑 `cargo fmt --check`、`cargo clippy -D warnings`、`cargo test`、`pnpm typecheck`、`pnpm lint`、`pnpm build`，并用 `tauri-action` 产出未签名包（draft release，供人工下载验收）。
  - 前端骨架：路由（首页/实例/设置/账号/日志）、状态管理（Tauri event 订阅下载与启动进度）、i18n（复用 `next-intl`? 否——Vite 项目用 `react-i18next` 或直接自建 messages JSON，与 web 的键风格一致，先中英双语）、深浅色主题变量。
  - 安全：删 `launch` 任意命令执行；`tauri.conf.json` 的 `capabilities` 收敛到最小权限（不给 fs 全域读写，按数据目录授权）。
- **验收**：`cargo test` 在三平台 CI 全绿；三平台各能下载到一个可安装、能打开、能显示空实例列表的包；仓库里不再有构建产物；不存在任何"执行前端传入的任意命令"的入口。

### P0 实施记录（2026-10-27）

按计划做完，四处与计划文本不同，都是实施时发现的更优/更诚实的做法：

- **`dist/` 本来就没进版本库**（`.gitignore` 已含 `dist`）：基线那句记错了，"移出 git"无事可做。改为**提交 `Cargo.lock`**（脚手架漏了）——应用类项目要可复现构建，尤其三平台 CI 出包。
- **`net`（下载器）顺延到 P1**：P0 没有任何调用者，先写就是"没有读者的代码"。与它的首个调用者（版本/资源下载）一起落地，届时才知道进度事件与镜像重写的确切形状。P0 落了 `paths`/`config`/`account`/`api`/`error`/`commands`/`state` 七个模块，17 个 Rust 单测。
- **前端用视图状态而不是路由库**：5 个视图 + 一个侧栏，引 react-router 是净负担；`view` state + 侧栏按钮即可。日志视图顺延到 P5（那时才有日志可看），账号视图并入首页。
- **Prism 委托与 `.mrpack` 下载提前删除**（计划里是 P1 才删）：保留它们就得保留那个不安全的 `launch` 任意命令执行入口，或临时造一个只能用于此处的受限下载器——两者都比直接删掉更贵。当前"模组"页只浏览不安装，并在 UI 上写明安装能力随 P2/P3 落地（不放假按钮）。
- 顺带：所有后端 HTTP 移入 Rust（webview 不再出网，CSP 因此收紧到不放行任何远端 `connect-src`/`img-src`，皮肤以 `data:` URL 交付）；令牌不再进 localStorage；`identifier` 改 `com.mythicove.compass`（原为 `com.hsukqi-lee.compass`，与 `docs.mythicove.com` 的域名不一致，越晚改越贵）；i18n 自建 60 行 messages 表（不引 i18next）；`opener` 插件只用默认权限内的 `openUrl`/`revealItemInDir`（`openPath` 不在 `opener:default` 里）。
- **Windows 打包暂不签名**（用户决定）：SmartScreen 会提示"未知发布者"，安装文档需说明；后续若拿到 SignPath 的开源项目证书，在 `package` 作业里补 `signCommand` 即可。macOS 有 Apple Developer 账号，签名与公证在 P6 接线。

## Phase 1: 原生启动最小可用链路（预计 3~4 周）

目标：能从我们的皮肤站登录，并把**原版** Minecraft（1.21.x，向下兼容到 1.7.10）真的启动起来，皮肤在离线服务器上可见。这一阶段结束时"委托 Prism"的路径被删除。

- **W1 元数据与版本**
  - `version_manifest_v2.json` 拉取与本地缓存（含过期策略）；版本列表 UI（release/snapshot 过滤、搜索）。
  - 版本 JSON 全量解析：`downloads.client`、`assetIndex`、`libraries[]`、`arguments`/`minecraftArguments`、`javaVersion`、`mainClass`、`logging.client.argument`、`type`；`inheritsFrom`/`jar` 的继承合并（为 P3 的 loader 铺路，本阶段就要把合并函数写对并单测）。
  - client jar 下载 + sha1 校验。
- **W2 资源与库**
  - assets：asset index 解析 → `assets/objects/<aa>/<sha1>` 全量下载（并发+去重+校验+续传），legacy 的 `virtual`（复制到 `assets/virtual/<version>`）与 `map_to_resources`（复制到 `.minecraft/resources`）两条老路。
  - libraries：Maven 坐标 → 路径；多仓库回退（`libraries.minecraft.net` → Maven Central → 版本 JSON 指定的仓库）；`rules`（os/os.version/arch/features）与 `natives`（含 `${arch}` 替换）判定；`downloads.artifact` 与 `downloads.classifiers` 分别下载；`extract` 规则（排除 `META-INF/`）解压到实例的 natives 目录。
  - 下载 UI：总进度 + 每文件明细 + 速度 + 可取消 + 失败重试。
- **W3 Java 与启动参数**
  - Java 探测：按 `javaVersion.component`（alpha=8 / gamma=17 / delta=21）匹配；候选来源 = `JAVA_HOME`、Windows 注册表、macOS `/usr/libexec/java_home`、Linux 常见路径、用户手选、我们自动下载的 JRE（下载放 P5，此处只留接口）；用 `java -version` 实测校验而不是信路径名。
  - 参数构造（**本计划的正确性核心**）：`arguments.jvm`/`arguments.game` 与 legacy `minecraftArguments` 两条路径；全部占位符替换（`${auth_player_name}`、`${auth_uuid}`、`${auth_access_token}`、`${version_name}`、`${game_directory}`、`${assets_root}`、`${assets_index_name}`、`${natives_directory}`、`${classpath}`、`${version_type}`、`${user_type}`、`${resolution_width/height}`、`${launcher_name}`、`${launcher_version}`、`${game_assets}`、`${clientid}`、`${auth_xuid}`、`${ignoreList}`）；`rules`/`features`（`is_demo`、`has_custom_resolution`、`has_quick_plays_support`）求值；classpath 构造（库 + client jar + 继承版本 jar）；内存与 GC 参数（按 Java 版本选 G1/ZGC 参数集）；平台专属参数（macOS `-XstartOnFirstThread` 等）；Log4Shell 缓解参数；`logging.client.argument` 与配置文件落地。
  - 进程管理：spawn、stdout/stderr 实时流到 UI、退出码与"崩溃/正常退出"区分、游戏运行时启动器行为可配（保持/最小化/关闭）、同时只允许一个游戏进程（可配）。
- **W4 我们的账号与皮肤**
  - Yggdrasil 登录（玩家名 + 独立密码）接 `/authserver/authenticate`；令牌刷新与失效重登；`/authserver/validate` 保活。
  - authlib-injector：随版本下载并校验（GitHub release，版本固定 + sha256 记录在仓库里）；`-javaagent:authlibinjector.jar=<mirror api root>` 注入；用 `authlibinjector.yggdrasil.prefetched` 预取 `GET /` 的 meta（少一次启动期网络请求，离线更稳）；`skinDomains` 校验与 CSP 无关，但要断言皮肤域名与 mirror 一致。
  - 删除委托 Prism 的整条路径（`download_file` 裸命令 + `launch` + UI 上的"Launcher command"输入框）。
- **验收**：三平台各能在干净环境（无 Java、无 .minecraft）下完成"登录 → 装 1.21.x → 启动 → 进主菜单"；1.7.10 与 1.12.2 至少能启动到主菜单；离线服务器（用 authlib-injector 指向我们的 mirror）里其他玩家能看到正确皮肤；CI 的启动冒烟测试在三平台通过；仓库里已无任何 Prism 相关代码。

### P1 实施记录（2026-10-28，核心已交付）

已落地十个 Rust 模块 + 命令层 + UI 接线（实例建/装/启/停、下载进度、实时日志页），`cargo test` 92 passed、`clippy -D warnings` 干净、真下载冒烟本地通过（release 91.6s 装完 1.21.4：client jar + 84 库 + 4039 资源对象，幂等重装全 skipped）。**并且真机把游戏拉起来过**（Windows + Java 21 + javaw，用真账号走 ADR-0012 的启动器登录链路，注入 authlib-injector 指向本站，游戏到 `Setting user:` 与 `Backend library: LWJGL 3.3.3+5` 后主动停止）。**尚未做**：loader 与整合包（P3）、mod/内容管理（P2）。

与计划文本的差异，以及只有真数据/真网络才暴露的问题：

- **契约测试的价值当场兑现**：`object_url` 曾把本地缓存布局的 `objects/` 前缀拼进下载 URL，4039 个资源对象全 404，三平台 CI 与本地一致失败。它的单元测试是照着实现写的，所以"通过"了——**假样本只会把我以为的格式固化成契约**，抓到它的是真网络冒烟。实测：带 `objects/` 404、去掉 200 且 sha1 与索引相符。
- **镜像路径布局必须逐主机实测**：BMCLAPI 把 libraries 挂在 `/maven/`、资源挂在 `/objects/` 下。原实现"换主机、路径照搬"会让配了镜像的用户丢掉数量最多的两类文件。另加"镜像失败退回官方源一次"（实测 BMCLAPI 的 /maven 在部分网络下 403 而官方源 200）；非官方源（Fabric/NeoForge Maven、GitHub release）既不改写也不回退。
- **版本继承合并的规则被真实 Fabric profile 纠正**：子版本的 `arguments.jvm` 只有一条 `-DFabricMcEmu=…`，按"子覆盖父"合并会让启动命令既没有 `-Djava.library.path` 也没有 `-cp`，游戏根本起不来。改为**父 + 子拼接**（JVM 选项顺序无关，只要都在主类之前）；`game` 参数仍按既有约定子先父后。
- **失败清单要报实际请求的 URL**：原来只报原始 URL，用户配了镜像却看到官方域名，无法判断是源站坏还是镜像坏；且几千个文件全拼进一个错误串（74 条 = 几十 KB 的 HTML 403）。现改为报生效 URL 并截断成"前 5 条 + 另 N 个"。
- **一次误诊，记下判据**：本地资源全 404 时我判定为"本机网络拦截 Mojang CDN"，还据此加了镜像回退。真相是 URL 拼错——用同样错误的 URL 去 curl 当然也 404。**当三个独立干净环境给出同一个失败时，问题几乎一定在代码里。**
- 其余从真实样本挖出并钉进测试的细节：现代 natives 是 4 段坐标走 classpath、老式才有 `natives`+`extract`；1.21.4 的 arm64 natives 只有 `os.name` 规则没有 arch 规则（同平台多条命中就全放行）；Fabric 的库没有 `downloads` 块且部分条目无校验和（空 sha1 = 无从校验，不等于校验通过）；`-Dlog4j.configurationFile` 不在 `arguments.jvm` 里；Log4Shell 边界是 1.18.1；库条数按平台钉死（1.21.4：Win 84 / macOS 77 / Linux 70）。
- **真机启动抓到 mirror 的一个真 bug**：`GET /` meta 的 `signaturePublickey` 实现成了 **base64(PEM)**，authlib-injector 1.2.8 报 `Unable to parse metadata: Bad signature public key` 并放弃注入——游戏照样能启动，但皮肤与进服身份全废，属于"看起来能用其实坏了"的最难查那一类。mirror 侧已修为 PEM 文本（ADR-0008 补了修正说明）。**mirror 的旧单测把这个错误形状固化了**（先解 base64 再 `pem.Decode`，只能证明"我们自己解得开"）。可复用的结论：**与外部客户端的格式契约，只能由那个客户端来验**。
- 启动编排（读版本 → 选 Java → 备 injector → 拼命令行 → 解压 natives）收敛为 `runner::prepare_launch` 一份实现，命令层与冒烟测试共用；测试里重写一遍顺序的话，它只能证明自己是对的。

## Phase 2: 实例与内容管理（预计 3 周）

目标：从"能启动一个版本"到"能管理多个实例与它们的内容"，并把 Hoard 接成内容源。

- **W5 实例模型**
  - `instance.json`：名称、图标、备注、版本 id、loader 信息、Java 路径与版本覆盖、JVM/游戏参数覆盖、内存、分辨率、启动前命令（**白名单校验**，见 P0 决策 7 的教训——不给任意命令留口）、直连服务器（`--server`/`--port`）、Quick Play（`--quickPlaySingleplayer`/`--quickPlayMultiplayer`）、创建/最后启动时间、统计（启动次数/游戏时长）。
  - 实例列表 UI：卡片/列表双视图、搜索、按最近启动/名称/版本排序、标签、复制实例、重命名（含目录迁移）、导出/导入实例（zip，排除 logs/crash-reports，可选排除 saves）、删除（二次确认 + 显示将删除的体积）。
- **W6 内容管理**
  - mod 列表：解析 jar 元数据（`fabric.mod.json`、`quilt.mod.json`、`META-INF/(neo)forge.mods.toml`、`neoforge.mods.toml`，以及 Forge 的 `mcmod.info`）取名称/版本/loader/依赖；启用/禁用（`.jar.disabled` 重命名法）；打开所在目录；删除；拖拽导入；按实例的游戏版本过滤显示不兼容项并给出原因。
  - 资源包 / 光影包 / 存档 / 数据包：列表、启用顺序（资源包 `pack.mcmeta` 的 `pack_format` 与游戏版本匹配检查）、导入、删除、打开目录。
  - `options.txt` 常用项图形化（分辨率、全屏、语言、FOV、渲染距离）与"打开配置文件"逃生口。
- **W7 Hoard 集成**
  - 从 Hoard 搜索 mod / 整合包（`/v2/search`，含 facets）、查看详情与版本列表、一键装到当前实例（`.jar` 直接落到 `mods/`，`.mrpack` 走 P3 的安装器）；下载进度并入统一下载器。
  - 版本匹配：按实例的游戏版本与 loader 过滤可装版本，装不兼容版本时明确报错而不是静默失败。
  - 已安装 mod 的更新检查（对比 Hoard 上的最新版本号）与批量更新。
- **验收**：能同时维护 3 个以上互不干扰的实例（不同游戏版本/不同 loader/不同 Java），各自 mods 与存档独立；mod 列表能正确显示 loader 与依赖并支持启停；能从 Hoard 搜到并装进当前实例；导出再导入的实例可正常启动。

### P2 实施记录（2026-10-28，实例设置与内容管理已交付）

已落地：实例设置（内存 / Java 路径 / 分辨率 / 直连服务器 / 演示模式 / 自定义 JVM 与游戏参数）、实例复制（字节级进度事件，跳过 `natives`、`logs`、`crash-reports`、`quickPlay` 与临时文件）、四类内容（mods / 资源包 / 光影 / 存档）的扫描、jar 内元数据解析、启停、导入（原生文件选择器 + 窗口拖放）、删除、打开目录。`cargo test` 121 + 8 + 7 通过，`clippy --all-targets -D warnings` 与 `tsc --noEmit` 干净。

与计划文本的差异（都是想清楚之后改的，不是漏做）：

- **只有 mods 能启用/禁用**。计划里资源包也要"启用顺序"，但资源包、光影、存档的启用状态是**游戏自己**写在 `options.txt` 与各自配置里的；启动器再造一个开关，UI 上说已启用、游戏里没生效，那是骗人的。禁用 mods 用 `mods/disabled/` 子目录（Forge/Fabric 只扫 `mods/*.jar` 不递归，所以放进去就是禁用；这也是 HMCL/PCL 的惯例，用户手动移动同样生效），同时认得用户自己改的 `.jar.disabled` 后缀，启用时去掉后缀。
- **不做"重命名含目录迁移"**。slug 是磁盘身份，也是"正在运行的是哪个实例"的键；迁移目录等于在运行期换身份，失败模式多而用户收益为零。可改的是显示名（`name`），与目录名解耦。
- **不做"启动前命令"**（W5 里写了要白名单校验）。白名单化的任意命令行仍然是"配置文件里能触发进程执行"，P0 决策 7 的教训恰恰是别留这种口。真有需求时应当是一组**具名动作**（如"清理 natives"），不是命令行。这条记为待决，不是已实现。
- **datapacks 不是一类内容**：它在 `saves/<世界>/datapacks` 里，属于某个世界而不是实例。计划把它与 mods 并列是错的。
- **未做**：实例导出/导入 zip、图标/备注/标签/卡片视图/搜索排序、`options.txt` 图形化（同上，那是游戏自己的状态）、按游戏版本标出不兼容的 mod（要 loader 元数据，与 P3 一起做）、资源包 `pack_format` 匹配检查、**Hoard 装进实例（W7，按约定放最后）**。当前 Hoard 只做浏览与版本列表，页面下方保留。

只有真数据/真客户端才暴露的问题：

- **`--server`/`--port` 在 1.20 起已被 Quick Play 取代**。原来无条件追加 `--server`，1.21.4 的客户端并不接受它——症状是"设了直连服务器，游戏却停在主菜单"，且不报错。现在判据取自**版本 JSON 本身**（游戏参数模板里有没有 `--quickPlayMultiplayer`），不是写死的版本表：1.21.4 走 Quick Play（值经 `${quickPlayMultiplayer}` 注入，日志目录从 `game_dir` 派生，让"设了服务器却没连上"在结构上不可能），1.16.5 与 1.12.2 走 `--server`/`--port`。**而旧测试断言的正是错的那条**（1.21.4 会收到 `--server`），它照着"无条件追加"的实现写，所以一直通过。
- **两道新的契约门**，因为这个 crate 有两份"两侧手写、编译期毫无关联"的清单：
  - `tests/ipc_contract.rs`：比对 `commands.rs` 定义的命令、`lib.rs` 注册的命令、前端 `ipc.ts` 调用的命令，并要求**每个命令都有前端调用方**（启动器没有别的消费者，没有调用方的命令就是没被验证过的命令）。第一次跑就查出 `auth_status` 与 `instance_ready` 两个定义了但没注册也没人调的命令——已删。
  - `tests/shape_contract.rs`：比对 Rust serde 结构体与 TS interface 的**线上字段名**（应用结构体级 `rename_all` 与逐字段 `rename`，跳过 `serde(skip)`；两侧异名的载荷列在 ALIASES，且过期条目有测试盯着）。第一次跑就查出 `ManifestEntry` 在 TS 侧少了 `complianceLevel`。字段名错一个字母的后果是 cargo test 与 tsc 全绿、UI 永远拿到 `undefined`，而 `undefined` 在 React 里通常只是少显示一个字段、不抛错。
  - 两道门的解析器本身都有测试（喂已知输入验证输出）：**一道会漏报的门比没有门更糟**，绿灯会变成假信号；一道会误报的门很快就会被下一个人删掉。
- **mod 元数据解析拿真 jar 验过**（`tests/real_mods.rs`，默认忽略，样本获取命令写在文件里）。五种真样本、四种格式全对：Sodium/Lithium（`fabric.mod.json`）、JEI NeoForge（`META-INF/neoforge.mods.toml`）、JEI Forge（`META-INF/mods.toml`，其中 `${file.jarVersion}` 占位符回落到 MANIFEST 的 `Implementation-Version` 成功）、JEI 1.12.2（`mcmod.info`）。不进 CI：格式变动很少，而把 Modrinth 变成三平台 CI 依赖换来的是偶发红；改解析器时手动跑。
- 其它钉进测试的细节：元数据解析失败一律降级为文件名（一个坏 jar 不该让整个列表变空）；超过 512KiB 的"元数据"条目直接不读；`mods/` 里的隐藏文件与 `.tmp` 不算内容；导入同名不覆盖且冲突时整批不写入；文件夹对存档与资源包合法（世界就是目录、资源包可以是解压形态），对 mods 直接拒绝（游戏只加载 jar，静默放进去等于骗人）；内容文件名一律过校验（挡掉分隔符与 `..`），操作只接受实例目录内的裸文件名。

### P2 续（2026-10-28 晚）：导出/导入、Hoard 安装、依赖解析

上面记录之后又补齐了三块，P2 的功能面到此收口。

**实例导出/导入**。可选"不含存档"（分享实例配置与 mod，而不把本人的世界一起塞进包里）；`logs`/`crash-reports`/`natives`/`quickPlay` 一律不打包，跳过规则收敛到 `archive::SKIP_DIRS` 一处——复制实例与导出实例必须给出同一个答案，否则"复制出来的"与"导出再导入的"不一样。

导入**必须先"看一眼"再落盘**，这不是预览装饰而是安全控制：实例配置里有 `java_path` 与自定义 JVM/游戏参数，导入并启动就等于让一个外部文件决定执行什么——那正是 P0 删掉 `launch(program,args)` 的理由，不能从数据文件把它放回来。所以 `instance_inspect_archive` 只读压缩包里的 `instance.json`（不解压、不建目录），UI 把 JVM 参数、游戏参数、直连服务器、演示模式、是否指定了 Java 路径逐条摊开，用户确认后才 `instance_import`。另外两条：包里的 slug 一律不采信（本地目录名由本地生成），包里的 `java_path` 导入时清空（那是别人机器上的路径，留着只会让第一次启动报一句指向别人硬盘的错）。zip-slip 防护也收敛成一份实现（`archive::safe_rel_path`），`extract_natives` 改为调用它：三处各写一遍的话，迟早有一处忘了检查 `..`，而那一处就是"别人给的压缩包能写到任意路径"。

**从 Hoard 装进实例**。校验和挑哪一个由 Rust 决定（`hashes.sha1`），不让每个调用方各挑一遍——UI 挑错了就是静默地不校验。下载复用同一个 `Downloader`，所以进度、重试、续传、校验、镜像回退全都继承；失败时清掉 `.part`，且 `.part` 不再被当成内容显示（下载中断留下的 `mods/foo.jar.part` 显示成一个"mod"，用户会以为装了个坏 mod）。服务端给的两个字段按不可信处理：`filename` 走与本地导入同一套校验，`url` 只允许 http/https（启动器跑在用户自己的网络位置上，不该替远端去访问 `file://` 或内网地址）。

核契约时抓出一处真问题：`api/specs/hoard.openapi.yaml` 里 `Version` 的 required 只有 `[id, project_id, version_number]`，而客户端把 `version_type` 当必填——一个**合法**响应会让整个版本列表解码失败，UI 上表现为"搜到了但点不开"。`File` 在规范里没有 required，`url`/`filename` 也一并改成容忍缺省，由真正用它的 `hoard_install` 校验（空值各自报错，而不是下载一个空文件）。这条测试的样本刻意带上"字段缺省"的情形：Hoard 的 Go 结构体给 `loaders`/`game_versions` 加了 `omitempty`，空数组时整个键不出现。

**mod 依赖解析**（验收项"显示 loader 与依赖"的后半截）。四种格式各写各的：fabric 的 `depends` 是对象、quilt 是数组（元素可能是裸字符串或带 `versions`/`optional` 的对象）、Forge/NeoForge 挂在 `dependencies.<本 mod 的 modId>` 下并用 `type=required` 或 `mandatory=true` 区分必需、`mcmod.info` 只有 modId 没有约束。只收必需项：把 `optional` 与 `incompatible` 也列进来，用户会以为"缺了它起不来"，而 `incompatible` 的意思恰恰相反。UI 明确写着"只展示、不求值版本区间、不检查缺失"——显示了一个清单却不说明它没被校验过，用户会把它当成兼容性保证。真依赖解析（版本区间求值 + 缺失检查）属于 P3。

对着真 jar 跑出来的两个问题，都是坐在桌前想不出来的：

1. **fabric 的 `depends` 值可能是字符串也可能是数组**，sodium 0.6.13 里两种同时存在（`"minecraft": ["1.21.4"]` 与 `"fabricloader": ">=0.16.0"`）。只按一种形状解析会让**整个** `fabric.mod.json` 解码失败，于是这个 mod 从"有元数据"退化成"读不出名字"——为了加一个字段，把已经能用的功能弄坏了。
2. 三个真 jar 的 mod id 都叫 `jei`（forge / neoforge / legacy），而 1.12 那个的 `mcmod.info` 里 `dependencies` 本来就是空数组；第一版断言按 mod id 匹配，把 legacy 的 JEI 也算进 toml 断言 → 假失败。**空是数据本身如此，不是解析失败。**

### P2 期间的三次 CI 红（都是测试的问题，不是实现的问题）

值得单独记下来，因为三次的形状不一样：

- **只在 Windows 上通过的测试**：断言 `import("../../etc/passwd")` 会报错。Linux 上那个文件**真的存在**，于是导入成功（写成 `mods/passwd`）。而且这个断言本身就是错的——源路径可以在磁盘任何位置，那是原生文件选择器给的、用户显式选的；要保证的是**写入点**永远在内容目录内。拆成两个测试后，一个测"文件名参数里的穿越一律拒绝"，一个测"从任何位置导入都只会写进内容目录"。
- **把 Windows 专属的路径形式当成全平台规则**：断言 `..\escape.txt`、`C:\Windows\...`、`C:evil.dll` 在所有平台都被拒。反斜杠与盘符只在 Windows 上是分隔符/前缀；在 Unix 上 `..\escape.txt` 只是一个名字里带反斜杠的普通文件，解压出来是目标目录里的一个文件，**不构成穿越**，放行它是正确行为。改成按平台断言各自真正被保证的东西，并补一条测性质的断言：凡放行的名字，拼到任意目标目录后仍在该目录内。"哪些字符串被拒"是实现细节，"写入点跑不出目标目录"才是要保证的性质——只测前者，就会在两个平台上都给出错误答案。
- **测试插在了早退之后**：实例往返（导出→导入→复制）写在了 `COMPASS_SMOKE_LAUNCH` 的早退之后，而 CI 不设这个变量，所以那段代码在 CI 里从来没执行过。本地带着 LAUNCH 跑"通过"了，看起来一切正常。**一段测试有没有真的被执行，是要单独确认的事。**

### P2 验收对照

- 能同时维护 3 个以上互不干扰的实例：✓（目录隔离 + 每实例设置 + 复制/导入）。
- mod 列表显示 loader 与依赖、支持启停：✓（依赖只展示不判定，见上）。
- 能从 Hoard 搜到并装进当前实例：✓（`.mrpack` 整合包属于 P3）。
- 导出再导入的实例可正常启动：✓（真安装冒烟测试里启动的**就是**导入出来的那个实例；三平台 CI 跑往返，带 `COMPASS_SMOKE_LAUNCH` 时真启动）。
- 未做且已记明原因：图标/备注/标签/双视图/搜索排序（不影响验收）、`options.txt` 图形化（那是游戏自己的状态，游戏运行时改会被覆盖）、启动前命令（安全上不该做，见上）、不兼容 mod 标注与资源包 `pack_format` 匹配检查（要版本区间求值，与 P3 的依赖解析一起）、已装 mod 的更新检查（Hoard 的项目 id 与 mod id 不是一一对应，靠猜匹配会给出错误的"有更新"）。

## Phase 3: Mod loader 与整合包（预计 4~5 周，最大单点风险在此）

目标：装得上主流 loader 与整合包。Forge 安装器是本阶段（也是整个计划）技术风险最高的一块。

- **W8 Fabric / Quilt（低风险，先拿下）**
  - Fabric：`meta.fabricmc.net/v2/versions/{game,loader}` → 取 loader 版本 → 用官方 profile JSON 生成继承版本（`inheritsFrom` + fabric-loader/intermediary/mapped-minecraft 库）；写入 `versions/<id>/`。
  - Quilt：`meta.quiltmc.org/v3` 同上（含 `quilt_installer` 的 hashed 依赖）。
  - UI：实例创建向导里选 loader 与版本；已装实例可"重装/换 loader 版本"。
- **W9 NeoForge / Forge（高风险）**
  - NeoForge（1.20.2+）：`maven.neoforged.net` 取 installer jar → 解析 `install_profile.json`（`data`/`processors`/`libraries`/`versionInfo`）→ 下载所需 Maven 工件 → **按序执行 processors**（用我们探测到的对应 Java 起子进程，传入 `jar`/`classpath`/`args`，替换 `${...}` 数据变量，校验 `outputs` 的 sha1）→ 生成继承版本 JSON。
  - Forge 1.13+：同上（installer 结构一致，注意 `maven.minecraftforge.net` 与 patches/`client.lzma` 等额外工件）。**已交付（`4a8dbf4`），且计划里"结构一致"这句只对了一半**：1.13–1.16 的 profile 是 spec 0、processor 没有 `sides`、工具链是 SpecialSource 而不是 AutoRenamingTool；1.17+ 才与 NeoForge 同构。差异清单见下面的实施记录。
  - Forge ≤1.12.2：**计划里这条的假设是错的，实测已纠正。** 原写"Universal/patches jar 合并、`minecraft.jar` 处理路径差异"——实测 1.12.2 的 `install_profile.json`（spec 0）里 `processors` 是**空数组**、`data` 也是空的，没有任何合并步骤：universal jar 就是一条普通库，而且它**打包在 installer 的 `maven/` 树里**（version.json 给的是 `"url": ""` + 真 sha1），官方 installer 只是把它拷出来。真正的差异在启动侧：旧式 `minecraftArguments` + `--tweakClass FMLTweaker` + `launchwrapper.Launch`，而且**原版 jar 必须在 classpath 上**（与 1.13+ 相反）。**1.8.9 / 1.7.10 是第四套格式（v0），已交付（`b6b2538`）**：与 1.12.2 也不同——版本 JSON 内联在 `versionInfo` 里（installer 中没有 `/version.json` 条目）、universal jar 在 installer 根部且那个 Maven 坐标是 404、库用 `url` + `clientreq`/`serverreq` 而不是 `rules`/`downloads`。详见下面的实施记录。
  - 失败可诊断：processor 的 stdout/stderr 全量落到安装日志并在 UI 展示，不要只显示"安装失败"。
- **W10 整合包安装**
  - `.mrpack`（Modrinth 格式，也是 Hoard 导出的格式）：解析 `modrinth.index.json`（`files[]` 的 `path`/`hashes.sha1`/`downloads[]`/`env.client|server`）、`overrides/`、`client-overrides/`、`server-overrides/`；按 `dependencies`（minecraft/fabric-loader/forge/neoforge/quilt-loader）先装版本与 loader；`env.client=unsupported` 的文件跳过。
  - MultiMC/`instance.cfg` 格式与"服务器整合包 .zip"；覆盖目录的冲突处理（同名文件以整合包为准并记录被覆盖项）。
  - CurseForge zip（`manifest.json` + `overrides/`）：**标注为可选**——需要第三方 API key 且分发条款受限；未配置 key 时 UI 明确说明"导入 CurseForge 整合包需自行配置 API key"，不做静默失败。
  - 安装过程可取消、可重试、断点续装（已下载的文件按 sha1 跳过）。
- **W11 依赖与冲突**
  - 依赖解析：装 mod 时读其元数据里的 `depends`/`requires`/`incompatible`/`embeds`，缺依赖时提示并从 Hoard 一键补装；`incompatible` 命中时阻止安装并说明原因。
  - 与 Hoard 的 `version_dependencies`（Phase 3 后端已实现）对齐语义，不自己发明第二套依赖模型。
- **验收**：能从零装出并成功启动这四个实例——Fabric 1.21.x、Quilt 1.20.x、NeoForge 1.21.x、Forge 1.12.2；能安装一个含 overrides 与 loader 依赖的 `.mrpack` 并进游戏；缺依赖的 mod 会被明确拒绝并给出可执行的补救动作。

### P3 实施记录（2026-10-28，W8 Fabric/Quilt 已交付）

W8 拿下：列 loader 版本、装 loader（取 profile → 与父版本合并 → 下载库）、换版本、卸回原版，UI 在实例卡片上开了一个 loader 面板。两家 meta 服务同构（Quilt 的 meta 是 Fabric 的分叉），所以一套实现两个 base 就够；合并与下载复用 P1 那条链路（新增 `Installer::install_profile` 入口，与 `install` 共用 `install_merged`，免得两条安装路径在"装完到底写了什么"上分岔）。

**端点与字段是对着线上服务核的**，不是照文档想象：Fabric 的 loader 对象有 `stable`，Quilt 的**没有**（它多的是 `hashed` 与 `hashes`），所以 `LoaderVersion.stable` 是 `Option<bool>`——把"来源没说"显示成"开发版"，是替它编了一句它没说过的话。同理，列表顺序自己排（实测 Quilt 返回的是 `beta.9, beta.7, beta.8, …`，直接给用户看就像列表在乱跳），排序规则只有一处，测试调的也是那一处。

真装 Fabric 时抓出继承链上的**两个方向相反的 bug**：

1. **死循环**：`resolve_from` 合并后读的是合并结果里的 `inheritsFrom`，而 `version::merge` 是"子覆盖父"，那个值永远是子版本原来的 ⇒ 同一个父版本被反复解析，撞满深度上限，报 `version inheritance deeper than 8`。P1 只单测过 `version::merge` 这个纯函数，这条**循环**从没真跑过（原版没有 `inheritsFrom`，所以一直没暴露）。
2. 第一版的修法（合并后清掉 `inheritsFrom`）**又是错的**：`jar_version()` 靠它定位 client jar——继承型版本自己不带 jar，jar 在父版本的目录下。清掉之后，装好的 Fabric 会去找 `versions/fabric-loader-…/fabric-loader-….jar`，症状是启动时 `client jar missing`。

正确做法是把两件事分开：**合并结果保留指向"提供 jar 的那个版本"，而链的推进走父版本自己的指针**。这一步抽成纯函数 `meta::merge_step(parent, child) -> (merged, next)`——要联网的部分只有取 JSON，而两个 bug 都在推进规则里，所以它可以离线测（三个测试：真实 Fabric profile、三层链 A←B←C、以及"一步收敛"的正面回归）。

一个自己抓到并删掉的坏设计：为了在 UI 上显示"这个实例是 Fabric 1.21.4"，我先写了一版从版本 id 反推 loader 的解析器，还写了个测试把它对 `quilt-loader-0.20.0-beta.9-1.21.4` 的错误答案（`None`）固化成"预期行为"，理由写的是"id 格式本身有歧义"。歧义是真的（loader 版本自己带 `-`，预发布游戏版本也带 `-`，按分隔符切必然有切错的时候），但结论错了：**装的那一刻我们本来就知道这三件事，记下来就行**，不需要事后猜。于是删掉解析器，改成 `Instance.loader: Option<InstanceLoader{kind, version, gameVersion}>`，由装载流程写入；设置面板改 `version_id` 时清空它（两者必须一致，而设置面板不知道新值对应哪个 loader——显示成 Fabric 而实际是原版，用户接下来会去 mods 目录里找不生效的原因）。这是本项目第四次踩到同一个模式：**测试照着实现写，就把实现的意见固化成了契约**。

其它同批落地的：`validate_version_id`（版本 id 会被当成 `versions/<id>/` 的目录名，而它来自官方清单**和** loader 的 meta 服务——一个返回 `"id": "../../evil"` 的 meta 就是一次任意路径写入）；URL 拼接复用 `api::join_path`（段级百分号编码，不写第二份）。

**真安装冒烟测试新增第 7/8 步**（三平台 CI 每次都跑，不需要显示环境）：

```
fabric loader versions: 255 (chosen 0.20.1 stable=Some(true))
fabric installed: id=fabric-loader-0.20.1-1.21.4 jar=1.21.4 main=…knot.KnotClient libs downloaded=9
quilt ok: 307 loader versions, profile quilt-loader-0.31.0-beta.1-1.21.4 (libs 11)
```

并断言启动计划里**同时**有子版本的 `-DFabricMcEmu` 与父版本的 `-Djava.library.path`（P1 那条"父+子拼接"教训的正面回归）、classpath 含 `fabric-loader` 与 `intermediary`、每一项都真在磁盘上、无残留 `${}`；Quilt 只验端点与 profile 形状（下载与合并的代码路径与 Fabric 完全相同，不必重复一遍），并断言它的 `stable` 全是 `None`。

一次偶发红：冒烟测试在"幂等重装"那步失败过一次，重跑即过——网络抖动（Downloader 本身已重试）。这条测试要下 ~550MB，判读偶发红时先按这个先验来。

**P3 尚未做**：W9 NeoForge/Forge（processor pipeline，全计划技术风险最高的一块，降级验收已预先写死）、W10 整合包（`.mrpack` / CurseForge）、W11 依赖解析与冲突阻止（现在依赖只展示不判定）。

### W9 前置调研（2026-10-28）：NeoForge installer 的真实结构

还没写 W9 的代码，但已经拿真的 installer 跑过一遍并拆开看了。记在这里是因为这些结论每条都要花时间才能拿到，重新推一遍是浪费。样本：NeoForge `21.4.161`（Minecraft 1.21.4）。

**取版本与 installer**：版本列表在 `https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml`（1852 个版本，`21.4.*` 对应 MC 1.21.4）；installer 是 `…/neoforge/<ver>/neoforge-<ver>-installer.jar`（7.2MB，411 个条目，自带 gson/jopt-simple 等 shaded 依赖）。命令行 `--installClient <dir>`，且**目标目录里必须先有 `launcher_profiles.json`**，否则报 `There is no minecraft launcher profile`（写个 `{}` 就够）。

**`install_profile.json`（130KB）顶层**：`spec=1, profile, version, icon, minecraft, json="/version.json", logo, welcome, mirrorList, hideExtract=true, data(10 项), processors(10 个), libraries(70 条), serverJarPath`。

**processors 的 `sides` 决定跑不跑**（这是最容易做错的一步）：

| # | sides | jar | 干什么 |
|---|-------|-----|--------|
| 0 | server | installertools | EXTRACT_FILES（run.sh/run.bat/args.txt） |
| 1 | server | installertools | BUNDLER_EXTRACT --libraries |
| 2 | server | installertools | BUNDLER_EXTRACT --jar-only |
| 3 | 两侧 | installertools | MCP_DATA（从 neoform zip 取 mappings） |
| 4 | 两侧 | installertools | DOWNLOAD_MOJMAPS（`--side {SIDE}`） |
| 5 | 两侧 | installertools | MERGE_MAPPING |
| 6 | **client** | jarsplitter | 把原版 client jar 切成 slim + extra |
| 7 | server | jarsplitter | 同上（服务端） |
| 8 | 两侧 | AutoRenamingTool:all | slim → srg（改名为 SRG） |
| 9 | 两侧 | binarypatcher:fatjar | `--clean {MC_SRG} --output {PATCHED} --apply {BINPATCH}` |

所以客户端安装跑 **3,4,5,6,8,9**，跳过 0,1,2,7。**这 10 个 processor 一个都没有 `outputs` 字段**——计划里写的"校验 outputs 的 sha1"在 NeoForge 21.4 上无处可用（部分 Forge 版本有，实现时要按"有就校验、没有就跳过"处理，不能假定一定有）。

**`data` 变量有三种形态，必须分别处理**：
- `[group:artifact:version[:classifier][@ext]]` = Maven 坐标 → 解析成 `libraries/` 下的路径（例：`[net.neoforged:neoform:1.21.4-20241203.161809:mappings@txt]`，注意 `@txt` 是扩展名覆盖、`:mappings` 是 classifier）；
- `/data/client.lzma` = **installer jar 内部**的路径 → 要先解出来（`BINPATCH` 就是它）；
- `'1.21.4-20241203.161809'` = 单引号包着的字面量 → 去掉引号（`MCP_VERSION`）。
- 客户端/服务端各一个值（`client`/`server` 两个键），按 `{SIDE}` 选。

**processor 参数里出现的内建变量**：`{INSTALLER}`（installer jar 路径）、`{ROOT}`（**含 `libraries/` 的那个目录**——官方 installer 把产物写到 `<root>/libraries/net/minecraft/client/…`）、`{MINECRAFT_JAR}`（原版 client jar）、`{SIDE}`、`{LIBRARY_DIR}`、`{MINECRAFT_VERSION}`（后两个出现在 `serverJarPath` 里），其余全来自 `data`。processor 的主类要从它那个 jar 的 `MANIFEST.MF` 里读 `Main-Class`。

**`libraries`（70 条）的形状与 Mojang 的一致**：每条都有 `downloads.artifact{sha1,size,url,path}`，所以现有 Downloader 不用改。里面**包含全部 processor 工具**（installertools、jarsplitter、`AutoRenamingTool:2.0.3:all`、`binarypatcher:2.1.2:fatjar`、`neoform:…@zip`）与 `net.neoforged:neoforge:21.4.161:universal`，但**不包含 `:client`**——那是 binarypatcher 的产物。

**`version.json`（installer 内的 `/version.json`，也是官方 installer 原样写出的那份）**：`id=neoforge-21.4.161`、`inheritsFrom=1.21.4`、`mainClass=cpw.mods.bootstraplauncher.BootstrapLauncher`、47 条库，`arguments.jvm` 里带着模块路径那一套（`-p <8 个 jar>`、`--add-modules ALL-MODULE-PATH`、若干 `--add-opens`/`--add-exports`）与 `-DignoreList=client-extra,${version_name}.jar`。

**官方 installer 跑完后磁盘上的产物**（客户端）：`versions/1.21.4/1.21.4.{jar,json}`、`versions/neoforge-21.4.161/neoforge-21.4.161.json`，以及 `libraries/` 下的 `client-1.21.4-20241203.161809-{slim,extra,srg}.jar`、`client-…-mappings.txt`、`neoforge-21.4.161-client.jar`（= `{PATCHED}`）、`neoforge-21.4.161-universal.jar`。

**两个必须先解决的关键点**：

1. **打过补丁的 client jar 不在任何 JSON 里。** `version.json` 的 47 条库中既没有 `net.neoforged:neoforge:21.4.161:client`，也没有 `net.minecraft:client:…:extra`（grep 结果 0 命中），官方 installer 也只是把 `/version.json` 原样写出。**已定论（真启动验过，提交 `a011e99`）：classpath 只放合并去重后的库，一个游戏 jar 都不放**——原版 jar、补丁 jar、extra jar 放进去都会因**自动模块重名**失败：

   | classpath 里放了什么 | 结果 |
   |---|---|
   | 原版 `1.21.4.jar` | `ResolutionException: Modules _1._21._4 and minecraft export package net.minecraft.util.profiling.jfr.event`（`_1._21._4` 就是 `1.21.4.jar` 的自动模块名） |
   | 补丁 `neoforge-21.4.161-client.jar` | `ResolutionException: Module mixin_synthetic reads more than one module named neoforge` |
   | **只放库** | `Launching target 'neoforgeclient'` → Datafixer → MixinExtras → `Setting user: Tester` → `Backend library: LWJGL version 3.3.3+5`，2187 行日志、stderr 空 |

   模块名是用 `jar --describe-module` 查实的：`neoforge-…-client.jar` 与 `neoforge-…-universal.jar` 的自动模块名**都是 `neoforge`**，`client-…-srg.jar` 与 `client-…-extra.jar` **都是 `client`**。原因也清楚了：`fml_loader` 自己按坐标去 libraries 目录找游戏 jar（日志里 `Found mod file … [locator: production client provider +net.neoforged:neoforge:21.4.161:client]`），启动器再塞一个进去就撞名。
   
   判据取自**数据**而非版本表：游戏参数里有没有 `--launchTarget`（ModLauncher 的入口参数）。NeoForge 与 Forge 1.17+ 有；Fabric/Quilt 走 KnotClient、Forge 1.12 走 `--tweakClass`，都没有（它们**必须**有原版 jar 在 classpath 上）。四种情况一个判据全对。`LaunchOptions.client_jar` 因此改成 `Option`，`runner` 只在需要时才检查它存在；反向也钉住了——原版与 Fabric 缺 client jar 时仍然报 `client jar missing`。

   另记一个只有真跑才知道的坑：`--launchTarget` 缺失时 `fml_loader` 拿到 `null`，在 `ImmediateWindowHandler.load` 里 NPE（`List.of("neoforgeclient","neoforgeclientdev").contains(null)`），**栈里完全看不出版本 JSON 少了一段参数**。所以有一条测试专门断言 `--launchTarget` 与四个 `--fml.*` 参数在合并后仍在、且排在父版本参数之前。
2. **库必须按 Maven 身份去重**（已修，提交 `6f349a0`）：原版 1.21.4 带 `org.ow2.asm:asm:9.6`，NeoForge 带 9.8 且把它放进模块路径，两份同时在 classpath 上时 BootstrapLauncher 直接抛 `Module named org.objectweb.asm was already on the JVMs module path … but class-path contains it at …asm-9.6.jar`。这条报错是**真跑出来的**，不是推测。Fabric 同样重复带 asm（9.10.1 对 9.6），只是没有模块路径检查所以一直没炸。去重键 = `group:artifact[:classifier[@ext]]`，不含版本号（子赢），classifier 必须进键（`lwjgl` 与其 `natives-*` 分片是两个文件）。

**另外两条实测事实**：官方 installer **不下载原版的库**（装完后父版本的 113 条库里有 102 条不在磁盘上），它假定启动器已经装过父版本——我们的 `install_profile` 走清单解析父版本并下载全部库，所以比它完整，也正因如此 NeoForge 安装必须先能解析 `inheritsFrom`（P3 W8 已具备）。以及官方 installer 自己也会因一次 TLS 抖动失败（`jline-reader` 下载 `Remote host terminated the handshake`），而且**重试成功之后仍把它算进失败清单**并整体报错——我们自己的下载器不该有这种行为（P1 起就是"重试后按最终结果判定"）。

**W9 进度**：① 定论 classpath（一个游戏 jar 都不放，判据 `--launchTarget`）**已完成**；② `install_profile.json` 解析 + data 三种形态 + 按 sides 过滤按序跑 processor **已完成，NeoForge 真装通过、三平台 CI 绿**（见下面的实施记录）；③ 装完落盘子版本 JSON 即可，**不需要**往库里追加 `{PATCHED}`/`{MC_EXTRA}` 合成条目（fml_loader 自己找）**已确认**。剩下的见本节末尾"W9 仍未做"。

### W9 实施记录（2026-10-28，NeoForge 已交付并真装验证）

NeoForge 装得起来了，而且是**用我们自己的代码真装一遍**验的，不是照官方 installer 的产物反推：列版本 → 下 installer（带 `.sha1` 校验）→ 读 `install_profile.json` → 装父版本 → 下 70 条 installer 库 → 按 `sides` 过滤跑 6 个 client processor → 装子版本。

```
neoforge versions: 158 (chosen 21.4.161)
installed: id=neoforge-21.4.161 jar=1.21.4 main=cpw.mods.bootstraplauncher.BootstrapLauncher java=21
minecraft client artifacts: [client-…-extra.jar, client-…-mappings.txt, client-…-slim.jar, client-…-srg.jar]
extracted installer entries: [client.lzma]
classpath entries: 119（一个游戏 jar 都没有，与真启动验过的组合一致）
```

**真跑出来的第一个失败比成功更有用**：processor 3（MCP_DATA）报 `Input does not exist: [net.neoforged:neoform:1.21.4-20241203.161809@zip]`——参数里除了 `{VAR}` 还有**内联的 Maven 坐标**（`[…]`）也要解析成库路径，而我只处理了前者。随后把真 profile 里所有 token 形态清点了一遍（13 个 `{VAR}` + 1 个 `[…]`，没有 `'literal'`），`substitute` 现在两种都认，且未知变量与不配对的括号一律报错而不是留字面量（留字面量的话，报错会出现在 Java 那边且看不出根因）。

**顺带修掉一个会让整条 pipeline 崩的旧 bug**：`version::maven_path` 不认 `@ext` 后缀，`neoform:…@zip` 与 `…:mappings@txt` 都被拼成 `.jar`。这个 bug 在 Fabric/Quilt 上不可能暴露（它们的坐标没有 `@ext`），只有 Forge/NeoForge 用得到——**接入一个新数据源，往往就是在给旧代码做体检**。

设计上的几个决定：

- `install_profile.json` 的 fixture 是官方 installer 里那份 **130KB 原文，未裁剪**。裁剪版又会变成"我以为的格式"，而这份 profile 的所有关键事实（sides 分布是 3/4/5/6/8/9 跑 client、data 三种形态、70 条库都带 `downloads.artifact` 与真 sha1、**没有一个 processor 有 `outputs`**）都由 10 条测试直接对它断言。
- `resolve_vars` 是**纯函数**，installer 内条目的解压单独一步（`extract_data_entries`）。第一版把 IO 混在变量表里，结果那条测试只能 panic——变量表算错了必须能离线测出来。
- processor 的 `Main-Class` 从它自己 jar 的 MANIFEST 读，不写死（installertools / jarsplitter / AutoRenamingTool / binarypatcher 各有各的主类，且随版本变）。MANIFEST 解析收敛成 `archive::manifest_attr[_from_text]` 一份实现并处理 72 字节折行的续行；`content.rs` 的 `Implementation-Version` 兜底改为复用它。
- `Installer` 借出 `downloader()` 与 `paths()`：processor 的 `{ROOT}`/`{LIBRARY_DIR}` 必须与安装产物落点是同一套布局，各造一份就会分岔。
- 版本列表按"游戏版本去掉 `1.` 前缀"过滤（1.21.4 → `21.4.x`，NeoForge 自己的编号约定）；**过滤结果为空时退回完整列表**，好过给一个空列表加一句猜不出原因的提示。Maven 元数据没有 stable 的概念，所以 `stable` 全是 `None`（不显示成"开发版"）。
- CI 的 smoke 作业加了 `setup-java` 21 与 `neoforge_live` 步骤，三平台都跑：processor pipeline 对路径分隔符与 java 可执行文件名敏感，**只在 Windows 上验过不算验过**。（结果：`install a real NeoForge version (processor pipeline)` 在 ubuntu / windows / macos 三个作业里全部 success。）
- CI 的两个 smoke 步骤**不加 `--release`**：`[profile.release] panic = "abort"` 与测试需要的 unwind 会在同一个 target 目录里打架（本地实测 `the crate compass_lib requires panic strategy abort which is incompatible with this crate's strategy of unwind`，伴随一串 `output filename collision`）。这两个测试是 I/O 密集，release 买不到可测速度：NeoForge debug 45.0s / release 52.0s。
- 测试一律用 `compass_lib::api::http_client()` 建 client，不要 `reqwest::Client::new()`：依赖图里有**两份 reqwest**（tauri 2.12.5 用 0.13、我们用 0.12），测试目标里那个名字有歧义，ubuntu 上直接编不过。改用 lib 的构造器顺带让**连接超时、请求超时与 User-Agent 第一次被测试覆盖**——原来测试裸建 client，那三条生产配置从没被任何测试碰到过。

- **W9 补完（`5138c3e`）：真启动我们自己装出来的那份 NeoForge。** `installs_neoforge_for_real` 钉的是启动计划（classpath 组成、asm 只一份、`--launchTarget neoforgeclient`、每项都在磁盘上），计划自洽不等于 JVM 起得来。新增 `launches_neoforge_for_real`：装完 → `runner::build` → 解 natives → `launch::spawn`，然后**边收输出边轮询标记，命中即 kill**。不能等退出：有显示服务的机器上游戏会真开窗一直跑。标记只挑结构稳定的三行（ModLauncher 的 `Launching target 'neoforgeclient'`、原版 `Setting user:`、`Backend library: LWJGL`），同时认致命标记（`export package net.minecraft`、`reads more than one module named`、`ClassNotFoundException`）以便早失败。结果：暖启 32s 走到 LWJGL 绑定，一次通过——**装的东西本来就是对的**；第一次跑红的是我的标记表（照旧日志写死了 `ModdedDatafixers`，这个版本记的是 `mojang/DataFixerBuilder`）。
- 该测试**不进 CI**：GLFW 建窗在那行日志之前，headless runner 永远走不到标记，还要再下一份 ~700MB。CI 按名字只跑 `installs_neoforge_for_real`，真启动是本地验收步骤。把"CI 覆盖到哪为止"写在 workflow 注释里，好过让它绿着但覆盖面含糊。

- **W9 补完（`4a8dbf4`）：Forge 装通了，而且它不是"换个 URL 的 NeoForge"。** 动手前先开了 6 个真 installer（1.7.10 / 1.12.2 / 1.13.2 / 1.16.5 / 1.20.1 / 1.21.4），实测跨**三套格式**：

  | | 1.21.4-54.1.22 | 1.16.5-36.2.39 | 1.12.2-14.23.5.2864 |
  |---|---|---|---|
  | spec | 1 | 0 | 0 |
  | processors | 7（client 侧 3） | 4（**都没有 sides** = client 全跑） | **空数组** |
  | 带 `outputs` | 5 | 2 | 0 |
  | 主类 | `net.minecraftforge.bootstrap.ForgeBootstrap` | `cpw.mods.modlauncher.Launcher` | `net.minecraft.launchwrapper.Launch` |
  | 游戏参数 | `--launchTarget forge_client`（下划线） | `--launchTarget fmlclient` | 旧式 `minecraftArguments` + `--tweakClass` |
  | 映射 | `@tsrg`（NeoForge 用 `@txt`） | `mcp_config@zip` + SpecialSource | 无 |
  | 原版 jar 上 classpath | 否 | 否 | **是** |

  NeoForge 只覆盖第一套的一半（它一个 `outputs` 都没有）。
- **两个 bug 只有真装才炸得出来**，NeoForge 那条路上都走不到：
  1. **`outputs` 的值也是变量引用。** Forge 写的是 `{MOJMAPS}={MOJMAPS_SHA}`，而 `plan_processor` 只替换了键，于是拿字面量去比对 sha1，报 `want {MOJMAPS_SHA} got c23f3418…`——**这句报错长得像"产物被篡改"**，会把人整个带到安全问题上。NeoForge 21.4 的 10 个 processor 一个 `outputs` 都没有，所以这条路径从没执行过。已抽成纯函数 `forge::resolve_outputs` 并离线钉住（5 个带 outputs 的 processor 全部解析成"绝对路径 + 40 位十六进制"）。
  2. **每个 Forge 版本 JSON 都恰好有一条 `"url": ""` 的库。** 那不是坏数据，意思是"本地产出"：1.21.4 的是 binarypatcher 的输出（sha1 与 `{PATCHED_SHA}` 一致），1.12.2 / 1.16.5 的**打包在 installer 的 `maven/` 树里**。空 URL 过去会变成一次 HTTP 请求，失败信息是 `failed to download 1 file(s): : http: builder error`（注意那个空的来源名）。现在先把 installer 的 `maven/` 解到 `libraries/`（官方 installer 就是这么干的），仍然没就位的空 URL 会报出路径与期望 sha1。校验没有因此放松：下载器认"已就位"靠的就是版本 JSON 里的 sha1。
- **顺带修掉一个排序 bug**：Maven 元数据的文档顺序不可信（1.16.5 那段末尾是 `36.0.0`，`36.2.39` 在中间），而 Forge 旧版的 loader 段有**四**位数字（`14.23.5.2864`）——三段键会让 `2860` 与 `2864` 并列，"哪个最新"就交回给了服务端排列。`version_key` 改成比较 `-` 两侧的**全部**数字段；预发布标签仍解析为空次键，所以 `0.20.0-beta.9` 不会排到 `0.20.0` 前面。
- **纠正一条我先前写下的概括**：规则不是"classpath 上绝不放游戏 jar"。NeoForge 的 version.json **根本不列** `neoforged:neoforge:*`（fml_loader 自己按坐标找），而且它有 15 条 jvm 参数含 `-p` 模块路径，自动模块重名才致命；Forge 1.21.4 把 `:universal` 与 `:client` **都列了进去**，jvm 参数只有 1 条、没有模块路径，全在 classpath 上就不构成模块，也就没有撞名问题。**真正的规则一直只有一条：版本 JSON 写了什么就放什么，我们自己什么都不加。**
- **CI 三平台同时炸出一个本地结构上发现不了的 bug（`27290d0` 修）**：NeoForge 21.4 与 Forge 1.21.4 的 `data` 里都有一个叫 `BINPATCH` 的变量、都指向各自 jar 内的 `/data/client.lzma`，而 `extract_data_entries` 的落点**只按变量名分目录**。共用数据目录时后装的那个看见"文件已在位"就跳过解压，于是拿着**另一家的补丁包**去跑 binarypatcher，报的是 `Patch expected com/mojang/blaze3d/pipeline/MainTarget$AttachmentState to have the checksum ccc190c5 but it was e16f8c1d`——一句完全看不出"用错了 installer 的文件"的话。真实启动器就是一个数据目录装多个 loader，所以这个 bug 迟早会发生；CI 只是先撞上了，因为我让 NeoForge 与 Forge 两步共用目录以省掉重复的 1.21.4 资源下载，而本地两个 loader 各用独立目录，恰好是唯一能把它藏住的安排。修法是把命名空间取自 installer jar 的文件名、并且**在函数内部**推导（调用方就没机会传错）。修完在共用目录下实测三份文件：`BINPATCH/client.lzma` 3289.5KB（旧布局残留）、`neoforge-21.4.161-installer/…` 3289.5KB、`forge-1.21.4-54.1.22-installer/…` **2928.7KB**——同名变量、同名条目、不同字节，旧布局正是会把 3289.5KB 那份端给 Forge。
- 测试：6 份真 fixture（未裁剪，11–35KB）+ 6 条离线测试；`tests/forge_live.rs` 真装 1.21.4 与 1.12.2（本地都通过，classpath 分别 120 / 51 条，legacy 那条验到"原版 jar 必须在、`--tweakClass` 从旧式参数展开、Java 8"）。live 测试的公用工具收到 `tests/live/`，两个 live 文件不会再各写一份然后分岔。CI 三平台跑现代 Forge，并与 NeoForge 步骤**共用数据目录**（同为 1.21.4，原版库与资源只下一次）——正是这个共用把上面那个 bug 逼了出来。
- **CI 不跑 legacy Forge**：1.12.2 要再下 ~1GB 旧资源，而它独有的那条路径（从 installer 的 `maven/` 取产物）已有离线单测 `installer_maven_tree_is_extracted_into_libraries` 钉住，含 zip-slip 拒绝与幂等。1.16.5（中间那套：无 sides + 内联坐标 + SpecialSource）同样只有离线 fixture 覆盖，**没有真装过**——它的 pipeline 与 1.21.4 同构，但这句话是推断，不是实测。

- **W9 补完（`b6b2538`）：Forge 是四套格式，不是三套。** 打开 1.8.9 / 1.7.10 的 installer 才发现 v0 与前三套**没有任何重叠**：`install_profile.json` 只有 `install` 与 `versionInfo` 两个键，installer 里**根本没有 `/version.json` 条目**（版本 JSON 内联在 `versionInfo`），顶层也没有 `minecraft`（在 `install.minecraft`），universal jar 在 installer **根部**而不是 `maven/` 下，而且它那条库指向的坐标在 Maven 上是 **404**（实测只发布了 `-universal.jar` 与 `-installer.jar`）——官方 installer 就是把根部那个文件拷到 `install.path` 对应的 Maven 落点，我们做同一件事，否则装完启动就是 CNFE。库还是"前 rules 时代"的形状：`url` 而不是 `downloads`，用 `clientreq`/`serverreq` 布尔表态（1.8.9 的 jline 是 `serverreq=true, clientreq=false`，而 launchwrapper 只写 `serverreq=true`，**clientreq 缺省表示客户端也要**，所以只有显式 false 才排除）。
- **同时把"1.16.5 只是推断"这笔债还了**，而它证明我猜错了一处：1.16.5 的 `{PATCHED}`（`forge-<ver>:client`）由 binarypatcher 产出，但**没有被列进 version.json**，所以不在 classpath 上——与 NeoForge 同，与 1.21.4 相反。四套格式并排看，classpath 规则从头到尾没变过：

  | version.json 列了什么 | 补丁 jar 在 classpath 上 |
  |---|---|
  | NeoForge 21.4：一个 `neoforge:*` 都不列 | 否（fml 按坐标找） |
  | Forge 1.21.4：`:universal` + `:client` | 是 |
  | Forge 1.16.5：只有无 classifier 的 `forge:<ver>` | 否 |
  | Forge 1.12.2 / 1.8.9：只有无 classifier 的 `forge:<ver>` | 不适用（无 processor） |

- **我自己的两条断言又错了，而且是同一个错**：把别的版本的数字/规则搬过来。`entries.len() > 60`（1.16.5 只有 49）换成与生产同一个解析器（`install::split_libraries`）算出的**精确集合**比对：120 == 120（1.21.4）、49 == 49（1.16.5）、51 == 50 + 原版 jar（1.12.2）、48 == 47 + 原版 jar（1.8.9）。阈值只能证明"差不多"，相等才证明规则对。另一条"补丁 jar 必须在 classpath 上"对 1.21.4 成立、对 1.16.5 不成立。
- 现在**四套格式全部本地真装通过**（1.21.4 / 1.16.5 / 1.12.2 / 1.8.9），加上 NeoForge 真装 + 真启动、`.mrpack` 真装与失败回滚，一共 8 个 live 测试。测试数据目录里放了 JDK 8（1.16.5 / 1.12.2 / 1.8.9 都要），这也让 Java 8 探测路径第一次被真跑到。五份真 profile（含 1.7.10）未裁剪入库，离线钉住四套格式。CI 仍只跑现代版：另外三套各要再下一整套旧资源（~1GB / ~700MB / ~1GB）。

**W9 仍未做**：1.7.10 的真装（profile 已入库并离线钉住，未真跑；它与 1.8.9 同属 v0，差别在 tweakClass 包名 `cpw.mods.fml` 对 `net.minecraftforge.fml`，已断言）、Forge/NeoForge 的 JarJar 内嵌库识别、以及四套格式里"装完真启动"只做了 NeoForge 那一套。

### W10 实施记录（2026-10-29，`.mrpack` 已交付并真装验证）

**格式取自六个真包，不是照规范文档写的**（Fabulously Optimized / Adrenaline / Sodium Plus / FastCraft / Optimized fps / Create+）。三处与"读规范会得到印象"不同：
- 顶层字段**顺序不固定**，部分包多一个 `summary`；Hoard 自己的导出还多一个**包级 `env`**（规范里没有，真包里一个都没有）。所以解析必须忽略未知字段——这一条同时让"我们自己的导出"与"Modrinth 的包"走同一套代码。
- `files[].env` 有**规范外的值**：Create+ 里有一个文件是 `unknown/unknown`。
- 六个包里 `hashes` 都同时给 sha1+sha512、`downloads` 都只有一个 CDN 地址，但都不是保证，所以缺 sha1 退化成"无从校验"而不是失败。

**两个产品决策**（都体现在安装结果里，不藏）：
- `optional` **装上**，并单独计数。理由：整合包是作者作为一个整体发布的，Create+ 客户端侧 155 个文件里 36 个是 optional，跳过近四分之一看起来像装坏了；装上去要去掉也容易。
- 规范外的 `env` 值**按 required 装 + 记一条警告**。静默吞掉一个看不懂的值，等它出问题就查不出来源。

**安全边界**（整合包决定我们下载什么、往哪写）：索引里的 `path` 与 zip 条目名都过 `archive::safe_rel_path`；下载只收 http/https；**slug 由调用方给，绝不取自包内**；`modpack_inspect` 是必需的第一步，UI 在落盘前把"会下载什么、会覆盖什么、装哪个 loader"摊开给用户看；`server-overrides/` 不应用到客户端实例；装失败把实例目录整个删掉（半成品实例比明确的失败更难处理）。

**真装验证**（仓库里那份真包，183KB）：48 个文件 / 42MB、62 个 overrides、Fabric 0.19.3 + 1.21.4，实例指向 `fabric-loader-0.19.3-1.21.4`，索引声明的每个文件都在它声明的位置、第一个文件的 sha1 与索引复核一致、92 条 classpath 全在磁盘上、KnotClient 主类且原版 jar 在。另有两条：loader 版本不存在的包装失败且**不留实例**；同一 slug 装第二次被明确拒绝。

**门禁自己抓到我两处问题**：
- `shape_contract` 红了，原因是我先前一次编辑吃掉了 `export interface LaunchInfo {` 后面的换行，`instance` 与 `{` 挤在同一行，而 TS 解析器是按行的——门报的正是"两侧字段不一致"，这就是它存在的意义。
- clippy 的 `too_many_arguments`（8/7）是对的，而修法是**减法**不是 allow：`Installer` 本来就持有 Downloader，再传一个就等于允许两套并发/镜像配置分岔。`populate` 的七元组返回也换成了具名结构体（元组的位置含义只有写的人记得，调用方数错一位编译器不拦）。

**CI**：三平台跑 `.mrpack` 真装，与 NeoForge / Forge 步骤**共用数据目录**——1.21.4 只下一次，这一步只多 ~42MB，所以跑得起。

**W10 仍未做**：MultiMC / `instance.cfg` 格式、"服务器整合包 .zip"、CurseForge zip（计划里标注为可选，需要第三方 API key）、整合包**导出**（现在只有导入）、以及 optional 文件的逐个勾选 UI（当前是一律装上并在结果里报数）。

### W11 实施记录（2026-10-29，依赖与冲突检查已交付）

**依赖模型只有一套**：`ModMeta.deps` 从"必需依赖的展示字符串"改成 `ModDep { id, kind, constraint }`，`kind` 的四个取值与 Hoard 的 `version_dependencies.dependency_type`、与 Modrinth 完全一致（`required` / `optional` / `incompatible` / `embedded`）。原来那句注释说"把 optional / incompatible 也列进来，用户会以为缺了这个就起不来"——顾虑是对的，但解法是**分类**而不是**只留一类**：W11 要靠 `incompatible` 拦冲突、靠 `embedded` 认出内嵌提供，少任何一类检查就会给出错误结论。

**样本是 Fabulously Optimized 1.21.4 的 46 个真 jar**（`modpack_live` 装出来的那份）。四件事只有真数据能告诉你：

1. **嵌套 jar 是正确性要求，不是锦上添花。** 这个包里 **15 个依赖 id 只由嵌套 jar 提供**（fabric-api 的各子模块、sodium 内嵌的 `fabric-renderer-api-v1`、controlify 内嵌的 `yet_another_config_lib_v3`…）。只扫顶层 jar 就会在一个完全正常的整合包上报 15 个假"缺依赖"——**用户会因此学会忽略所有警告**，那比不做检查更糟。现在读两层（109 个嵌套 jar，其中 2 个自己还带 `jars`），带单文件大小上限与总额预算。
2. **`provides` 别名。** 4/46 个 jar 声明了：`fabric-api provides ["fabric"]`、`sodium provides ["indium"]`、`cloth-config provides ["cloth-config2"]`。不认它，就有 7 个 mod 被报"缺 fabric"，而 fabric-api 明明就在目录里。
3. **3/46 个 jar 的 JSON 是技术上的非法**：Debugify 的 `description` 里有**裸换行**，mixintrace 与 NoChatReports 的字符串里有**裸 TAB**。Fabric Loader 用 Gson 宽松模式照样加载；我们严格解析就把这 3 个判成"读不出元数据"——它们在 UI 上没名字还算小事，**在依赖检查里完全不存在**才是要紧的（一个装着的 mod 对检查看不见 = 它声明的冲突与它提供的依赖都不算数，6.5% 的 mod 成盲区）。现在加了宽容重试：把字符串字面量内部的裸控制字符转义掉，**只在严格解析失败后才跑**，合法 JSON 一个字节不动。这个包的元数据覆盖率从 45/46 变成 **46/46**，必需依赖从 150 涨到 154。
4. **`breaks` 实测都带版本区间**（`{"sodium":"<0.6.6"}`），而 `conflicts` 是无条件的（`{"optifabric":"*"}`）。所以**只拦无条件的那一类**；带区间的报成"未判定，请自己确认"。四家的区间语法各不相同（`>=1.2 <2` / `[1.21.4,1.21.5)` / 裸版本号），自己写求值器判错的后果比明说"不判定"更糟。

**冲突必须双向查。** 冲突通常由**已装的那一方**声明（sodium 声明 `breaks: optifabric`，而 optifabric 自己什么都不声明）。只查待装 mod 的声明，就会在安装 optifabric 时放行、然后游戏启动时炸——那正是这个功能要防的事。

**一个 mod 自己提供的 id 不能当冲突对象**（它本身、它 `provides` 的别名、它内嵌的库）。这条是测试逼出来的：不排除的话，一个声明了 `breaks` 自己 id 的 jar **永远装不进去**。

**接线方式**：`hoard_install` 与 `content_import` 命中无条件冲突时**把文件删掉再报错**（留在目录里等于"我们拦下了它，但它还在"，下次启动照样炸）；新增 `content_check` 做整实例体检——整合包一次装几十个，逐个走闸门既慢（每个文件都要重扫目录）也不该拦（两个 mod 互相冲突不该让整包失败）；`modpack_install` 的返回值里直接带体检报告，不用等用户想起来去点"检查"。**禁用的 mod 在检查函数内部排除**，不交给调用方过滤：漏过滤的症状是"我明明禁用了那个 mod 它还说冲突"，从调用方很难看出来。

**验证**：`cargo test` 200 + 8 + 7、clippy `-D warnings`、fmt、tsc、vite build 全干净；真包上 46/46 有元数据、154 required / 23 optional / 76 incompatible / 120 embedded、**零假缺失、零假冲突**、38 条带版本约束的正确降级为"未判定"。

**W11 仍未做**：缺依赖时的"从 Hoard 一键补装"动作（现在只报 mod id，UI 可以拿它去搜）、Forge/NeoForge 的 JarJar 内嵌库识别（只做了 fabric/quilt 的 `jars`）、以及版本区间求值（**故意不做**，理由见上）。

## Phase 4: 账号与令牌安全（预计 2 周）

目标：多账号、令牌安全、以及把 ADR-0012 的独立密码体验补齐（现在用户必须回网站建独立密码，启动器里应当能直接看到状态并跳转）。

- **W12 账号**
  - 多账号管理与切换：我们的 Yggdrasil（玩家名 + 独立密码）、微软正版（OAuth device code flow，走 `login.microsoftonline.com` + Xbox Live → XSTS → Minecraft profile 链）、离线模式（自定义用户名，UUID 由名字派生，与 mirror 的离线 UUID 算法一致）。
  - **令牌入系统钥匙串**（`keyring`：Windows Credential Manager / macOS Keychain / Linux Secret Service），把 accessToken 移出 localStorage；钥匙串不可用时降级为加密文件并在 UI 明示风险。
  - 账号级操作：查看/新建该玩家的独立密码（直连 mirror 的 `/account/players/{name}/credentials`，明文只在输入框里）、被强制绑定第三方时的引导（`binding_required` 错误码 → 打开浏览器到账号页）、令牌失效的静默重登与"需要重新登录"的明确态。
  - 皮肤：当前账号玩家的皮肤/披风实时预览（沿用 skinview3d），多玩家时可选预览对象。
- **验收**：可同时保存三类账号并一键切换；退出登录后 localStorage 与磁盘上都不残留可用令牌（用文件级检查断言）；被管理员强制绑定第三方的账号在启动器里得到可操作的引导而不是一个 403。

### W12 实施记录（2026-10-29，多账号 + 令牌与账号列表分离已交付）

**`fc401ed`：accounts.json 里不再有任何机密。** 原来那一个账号连 `accessToken` 一起存在 accounts.json；现在 accounts.json 是**身份列表**（`AccountEntry`），令牌单独放 `secrets.json`（0600），按账号 id 索引。这个拆分让验收条件变得**可按文件断言**：`logout_leaves_no_usable_token_on_disk` 直接遍历数据目录找那个令牌字符串，而不是问接口"你觉得登出了吗"。

- 三层类型：`AccountEntry`（身份/时间戳，前端可见）、`Secrets`（令牌，只在 Rust 侧）、`Account`（启动时组装体）。`AccountView` 仍然不含令牌，并新增 `kind`。
- **账号 id 由 (kind, api_url, player_uuid) 派生**，不用随机数也不取玩家名：重复登录不会产生第二条、改名不会让令牌失联、同一个 uuid 在两个镜像站上仍是两个账号（令牌本来就不通用）。
- 退出只删**当前**那个账号与它的令牌——多账号之后"退出"不该把别人也登出。令牌轮换会覆盖，并断言旧令牌在磁盘上已消失。
- 旧的单账号文件在第一次读时迁移：令牌挪进 secrets.json 并从 accounts.json 抹掉。

**离线账号的 UUID 用真 JDK 21 校准过。** 算法是 `UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`（MD5 + 版本位 3 + IETF 变体位）。测试里的 8 个期望值是**在真 JDK 21 上跑那句 Java 得到的**，不是我照算法描述自己算的——那样只能证明实现等于我对描述的理解。这里错了的症状是皮肤取不到、服务器把你认成另一个人，离原因很远。名字按原版服务端能接受的范围校验（ASCII 字母数字下划线、≤16），否则报错来自服务器，看起来像我们的 bug。

**两条只有真写出来才会撞上的坑：**
1. **格式判定不能用"能不能解析"。** 第一版先试 `from_str::<AccountList>`、失败再退到旧格式——但 `AccountList` 两个字段都带 `#[serde(default)]`，于是**任何 JSON 对象都能解析成一个空列表**。旧文件被静默读成"没有账号"，而令牌还原样躺在里面没人管。现在按形状判（有没有 `accounts` 数组、有没有顶层 `playerUuid`）。
2. **`auth_check` 会删掉离线账号。** 它拿 `api_url` 去 validate，而离线账号两者都没有，必然落到 401/403 分支→清账号。**每次启动都会静默删除离线账号**。现在离线账号跳过校验。

**故意没做、也没假装做了的两件事：**
- **微软正版**：device code flow 需要一个 Azure 应用的 client ID，那是个待定决策，所以 `AccountKind` 里**没有 `microsoft` 变体**——加了就意味着 UI 上有个点了会失败的按钮。
- **secrets.json 不是加密的**：`SecretStoreInfo.encrypted` 恒为 false，设置页照实说明并给出路径。把混淆叫成加密，正是会让人误判风险的那类说法。换系统钥匙串只需改 `load_secrets` / `put_secrets` / `delete_secrets` 三个函数，调用方一行都不用动——这也是当初没急着定"钥匙串不可用时怎么办"的原因：那个决策不影响这一层的形状。

**顺带修掉一个 CI 撞出来的真 bug（`2baa377`）**：三个 modpack 测试在 CI 里并发共用一个数据目录（CI 没有 `--test-threads=1`，而我本地一直串行跑），两个安装同时下同一个库；`.part` 的名字是按 dest 定的（断点续装要靠它稳定），于是两边写同一个文件，一方 rename 成功后另一方 ENOENT，报成"下载失败"。更隐蔽的是它旁边那个窗口：A 校验通过后、rename 之前，B 可能把同一个 `.part` 截断重写，于是 dest 落地的是半截内容而**它已经"校验通过"了**——这种坏文件会被当成已下载，一路留到启动时炸成一句看不出来源的 ClassNotFoundException。两处都修了（ENOENT 时若 dest 已就位即成功；rename 之后再校验一次）。我先写的那条"两个下载器并发"测试**在撤掉修复后依然通过**（第二个下载器发现文件已就位就跳过了），所以它什么都没证明，已删除；竞争本身在单测里无法确定性复现，真正的回归信号就是 CI 那个并发场景。

**W12 仍未做**：微软正版登录（待 client ID 决策）、令牌进系统钥匙串（待"钥匙串不可用时怎么办"决策）、独立密码的查看/新建（mirror 的 `/account/players/{name}/credentials`）、`binding_required` 的引导、令牌失效的静默重登、多玩家时的皮肤预览选择。

## Phase 5: 诊断、Java 自动下载与自动更新（预计 3 周）

目标：把"出了问题只能截图求助"变成"启动器自己说清楚"，并去掉最后两个人工前置（装 Java、手动升级启动器）。

- **W13 日志与崩溃诊断**
  - 游戏日志查看器：实时流、ANSI 颜色、级别过滤、搜索、复制/导出、日志轮转；`logs/latest.log` 与 `crash-reports/` 归档列表。
  - **实测约束（2026-10-28 真机启动时发现的）**：传了 Mojang 的 `logging.client` 配置后，stdout 是 **XML 形式**（`<log4j:Message><![CDATA[Setting user: …]]></log4j:Message>`），不是纯文本。所以查看器要么解析这个 XML appender，要么改传自己的 plain-pattern 配置——**不能只做纯文本渲染**，否则用户看到的是一堆 CDATA。选前者还是后者要连带考虑：崩溃分析规则库是照着纯文本日志写的，而 `crash-reports/` 里的文件始终是纯文本。
  - 崩溃分析规则库（正则/关键字 → 人话 + 建议动作）：缺 mod、mod 版本不匹配、Java 版本不对、内存不足（OOM）、显卡驱动/LWJGL 初始化失败、Forge/NeoForge processor 失败、混装 loader（Fabric mod 进 Forge 实例）、磁盘空间不足、杀毒软件锁文件；命中后给出"一键动作"（如"切到 Java 17""补装缺失依赖""打开日志"）。
  - 安装/启动全过程的操作日志（可导出，供提 issue 用）。
- **W14 Java 自动下载**
  - 用 Mojang 官方 Java runtime manifest（`launchermeta.mojang.com/v1/products/java-runtime-*/<platform>/index.json`）按 `component` 下载对应 JRE，落 `cache/java/`，校验 sha1；离线/受限网络时回退到 Adoptium API（可配镜像）。
  - Java 管理页：列出已探测与已下载的 JRE、按版本绑定实例、手动添加、删除。
- **W15 自动更新**
  - `tauri-plugin-updater` + 静态 `latest.json`（版本、三平台产物 URL、minisign 签名）；更新检查可关（默认开）、下载在后台、提示后重启；**签名密钥的管理**写进文档（丢失即无法发布更新，等价于 ADR-0008 对 RSA 密钥的要求）。
  - 版本/资源清单的增量更新（版本 manifest 的 ETag/last-modified 缓存，避免每次启动全量拉）。
- **验收**：干净机器上不装 Java 也能启动（自动下载并绑定）；人为制造 5 类常见崩溃，启动器都能给出具体的原因与补救动作而不是"退出码 1"；发布一个 0.0.x→0.0.y 的更新，三平台的已安装实例都能自动升级。

## Phase 6: 三平台打包、签名与发布（预计 2~3 周）

目标：让陌生人按文档装上就能用——这是"对标 HMCL/PCL"的最后一里，也是最容易被低估的一里。

- **W16 Windows**
  - NSIS 安装包（含桌面/开始菜单快捷方式、卸载、可选关联 `.mrpack`）；MSI 备选；x64 与 arm64（可选）。
  - 代码签名：**决定先发未签名包**（用户 2026-10-27 拍板），因此 SmartScreen 的"未知发布者"提示与绕行说明必须写进安装文档；若要签名，走 [SignPath](https://signpath.org/) 的开源项目免费证书（比自购 EV 证书便宜且能过 SmartScreen 信誉），届时在 `package` 作业里补 `signCommand` 与 CI 密钥托管。
  - 杀软误报与路径长度（`\\?\` 前缀）问题的处理与自检提示。
- **W17 macOS**
  - 通用二进制或 arm64/x86_64 双包；`.dmg` + `pkg`；Gatekeeper：Developer ID 签名 + 公证（notarization）流程与 CI 集成；未签名包的"右键打开"说明。
  - macOS 专属：`-XstartOnFirstThread`、Application Support 目录、TCC（磁盘访问）提示。
- **W18 Linux 与发布**
  - AppImage（含 FUSE 缺失时的 `--appimage-extract-and-run` 说明）、deb、rpm；Arch/AUR 的 PKGBUILD 模板（社区维护，我们只给模板）。
  - 发布流程：tag → CI 出包 → 签名/公证 → 更新 `latest.json` → GitHub Release + 官网下载页（web 侧加下载入口与平台检测）；校验和文件（SHA256SUMS）随发布。
  - 文档：三平台安装与排障、镜像源配置、便携模式（把数据目录放进安装目录）、命令行参数（`compass --instance <slug> --launch`）。
- **验收**：三台干净机器（Windows 11 / macOS arm / Ubuntu LTS）各按文档走一遍：下载→安装→首次启动向导→登录→装版本→进游戏，全程不需要命令行、不需要预先装 Java；发布一次真实版本并让已安装实例自动更新成功。

---

## 风险清单（按"会不会打穿里程碑"排序）

1. **Forge processor pipeline（P3-W9）**：需要按 `install_profile.json` 在子进程里跑第三方 processor，工件下载、数据变量替换、`outputs` 校验、老版本（≤1.12）与新版本结构差异都在这儿。缓解：先做 NeoForge 与 Fabric（简单且覆盖大多数用户），Forge 排最后；预留整整一周缓冲；安装日志必须可读。**如果这块卡住，P3 的验收标准降级为"NeoForge + Fabric + Quilt"，Forge 单独作为 P3.5 延后**——这个降级要在开工时就写下来，而不是到时候临时改验收。
2. **参数构造的正确性（P1-W3）**：占位符/规则/特性开关组合极多，错一个就是"能启动但皮肤不出/存档找不到/natives 加载失败"。缓解：契约测试用真实版本 JSON 样本覆盖 5 个代表版本；把 HMCL 的启动参数作为对照基准（同一版本同一账号，比对参数集合）；冒烟测试跑真进程。
3. **CI 无法验证图形界面**：所有 UI 验收都靠人工清单。缓解：UI 逻辑尽量下沉到 Rust 单测；每阶段的人工验收写成可勾选清单并留档（截图 + 版本 + 平台）。
4. **下载体积与限流**：1.21 全量资源约 500MB+，官方 CDN 在部分地区很慢或被限。缓解：镜像源可配 + 并发可调 + 断点续传 + 全局去重缓存（多实例只下一次）；BMCLAPI 等镜像只作为可选默认值，写清合规与可用性风险。
5. ~~**签名与公证成本（P6）**~~ **已定案（2026-10-27）**：macOS 有 Apple Developer 账号 ⇒ Developer ID 签名 + 公证按原计划做（P6-W17），只剩把证书/凭据接进 CI 的活；Windows 先发**未签名**包，安装文档写清 SmartScreen 提示与绕行方式，若要签名走 SignPath 的开源项目免费证书（P6-W16）。剩余风险只是 CI 密钥托管与公证排队时间。
6. **authlib-injector 与新版本的兼容**：1.20.5+ 改了服务与 profile 签名，第三方认证依赖 authlib-injector 跟进。缓解：固定已验证的版本 + sha256；把"哪些游戏版本经我们实测可用"写进文档；升级前跑冒烟。
7. **并行开发的合并冲突**（本轮已发生一次：另一会话把不能编译的合并提交推上了 mirror main）。缓解：本计划的每个 W 任务都以**独立分支 + 小步合并**推进，合并后必须 `cargo test` + `pnpm typecheck` 再推 main。

## 里程碑与版本号

| 里程碑 | 对应 tag | 一句话判定 |
|---|---|---|
| P0 完成 | `compass v0.2.0-rc.1` | 三平台 CI 出包，仓库无构建产物，无任意命令执行入口 |
| P1 完成 | `compass v0.2.0` | **Compass 自己启动了原版 Minecraft 并加载了我们的皮肤**；Prism 路径已删除 |
| P2 完成 | `compass v0.3.0` | 多实例隔离可用，mod 与内容可管理，Hoard 是内容源 |
| P3 完成 | `compass v0.4.0` | Fabric/Quilt/NeoForge 装得上、`.mrpack` 装得上（Forge 若降级则记为 P3.5） |
| P4 完成 | `compass v0.5.0` | 三类账号可切换，令牌在系统钥匙串，独立密码可在启动器内管理 |
| P5 完成 | `compass v0.6.0` | 不装 Java 也能玩，崩溃能自己说清楚，启动器能自动更新 |
| P6 完成 | `compass v1.0.0` | 陌生人在三平台上按文档从下载到进游戏全程无命令行 |

## 同步要改的文档

- `docs/src/content/docs/products/compass.md`：现在写着"Yggdrasil 登录：邮箱 + 密码"（已随 ADR-0012 变为玩家名 + 独立密码）与"委托 Prism 启动"（P1 后失效）。该条已随 P0 完成：ADR-0012 措辞与"仅浏览 + 原生启动开发中"均已同步。
- `docs/src/content/docs/guides/authlib-injector.md`：P1-W4 之后补"Compass 自动注入"的说明。
- `docs/src/content/docs/plans/status.md`：Phase 4 第 2 条改为指向本文；每完成一个 Phase 在此记一行（含验收证据），沿用现有 `~~任务~~ ✅` 的写法。
- `web`：P6 需要加"下载启动器"页（平台检测 + 校验和 + 更新说明）。
