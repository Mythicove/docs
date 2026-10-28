---
title: Compass 启动器开发计划
---

- 日期：2026-10-27
- 状态：已批准，待开工
- 取代：[当前进度](/plans/status/)的 Phase 4 第 2 条（"Compass 原生启动或先做 Prism 账号深度集成"）。该条只给了方向，本文给出阶段/任务/验收。
- 目标：**Compass 自己把 Minecraft 拉起来**，并逐步补齐 HMCL/PCL 的功能面（实例管理、mod 与整合包、多账号、崩溃诊断、自动更新、三平台打包）。在此之前不再宣传"启动器可用"。

## 现状基线（开工前的事实）

- `compass` 仓：Tauri 2 脚手架 + 单页 React（`src/App.tsx` 约 5.1KB、`src-tauri/src/lib.rs` 约 1.2KB），Rust 侧只有两个命令：`download_file`（存到当前目录）与 `launch`（**执行任意 program + args**）。
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

## Phase 3: Mod loader 与整合包（预计 4~5 周，最大单点风险在此）

目标：装得上主流 loader 与整合包。Forge 安装器是本阶段（也是整个计划）技术风险最高的一块。

- **W8 Fabric / Quilt（低风险，先拿下）**
  - Fabric：`meta.fabricmc.net/v2/versions/{game,loader}` → 取 loader 版本 → 用官方 profile JSON 生成继承版本（`inheritsFrom` + fabric-loader/intermediary/mapped-minecraft 库）；写入 `versions/<id>/`。
  - Quilt：`meta.quiltmc.org/v3` 同上（含 `quilt_installer` 的 hashed 依赖）。
  - UI：实例创建向导里选 loader 与版本；已装实例可"重装/换 loader 版本"。
- **W9 NeoForge / Forge（高风险）**
  - NeoForge（1.20.2+）：`maven.neoforged.net` 取 installer jar → 解析 `install_profile.json`（`data`/`processors`/`libraries`/`versionInfo`）→ 下载所需 Maven 工件 → **按序执行 processors**（用我们探测到的对应 Java 起子进程，传入 `jar`/`classpath`/`args`，替换 `${...}` 数据变量，校验 `outputs` 的 sha1）→ 生成继承版本 JSON。
  - Forge 1.13+：同上（installer 结构一致，注意 `maven.minecraftforge.net` 与 patches/`client.lzma` 等额外工件）。
  - Forge ≤1.12.2：老 `install_profile.json`（v0）+ Universal/patches jar 合并、`minecraft.jar` 处理路径差异；这一段单独排一层测试（用 1.12.2、1.8.9、1.7.10 三个代表版本）。
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

## Phase 4: 账号与令牌安全（预计 2 周）

目标：多账号、令牌安全、以及把 ADR-0012 的独立密码体验补齐（现在用户必须回网站建独立密码，启动器里应当能直接看到状态并跳转）。

- **W12 账号**
  - 多账号管理与切换：我们的 Yggdrasil（玩家名 + 独立密码）、微软正版（OAuth device code flow，走 `login.microsoftonline.com` + Xbox Live → XSTS → Minecraft profile 链）、离线模式（自定义用户名，UUID 由名字派生，与 mirror 的离线 UUID 算法一致）。
  - **令牌入系统钥匙串**（`keyring`：Windows Credential Manager / macOS Keychain / Linux Secret Service），把 accessToken 移出 localStorage；钥匙串不可用时降级为加密文件并在 UI 明示风险。
  - 账号级操作：查看/新建该玩家的独立密码（直连 mirror 的 `/account/players/{name}/credentials`，明文只在输入框里）、被强制绑定第三方时的引导（`binding_required` 错误码 → 打开浏览器到账号页）、令牌失效的静默重登与"需要重新登录"的明确态。
  - 皮肤：当前账号玩家的皮肤/披风实时预览（沿用 skinview3d），多玩家时可选预览对象。
- **验收**：可同时保存三类账号并一键切换；退出登录后 localStorage 与磁盘上都不残留可用令牌（用文件级检查断言）；被管理员强制绑定第三方的账号在启动器里得到可操作的引导而不是一个 403。

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
