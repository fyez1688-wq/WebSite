# Next Task

## P0：必须先完成的安全问题

### 已完成：移除或修改 `admin / admin`

- 目标：生产和长期开发环境不得继续使用 `admin/admin`。
- 涉及文件：`.env`、`.env.example`、`README.md`、`prisma/seed.ts`。
- 验收条件：`.env.example` 使用占位密码；本地 `.env` 使用强密码；README 不鼓励使用弱密码；旧 `admin/admin` 不能登录。
- 已运行：`npm run lint`、`docker compose up -d --build app`、`docker compose exec -T app npm run admin:reset`、HTTP 登录后台验证。
- 结果：`admin@pzq1688.local` 可登录 `/admin`；旧 `admin/admin` 返回 401；数据库中旧 `admin` 状态为 `DISABLED`。
- 遗留风险：Windows 本机 `npm run admin:reset` 因 `tsx`/esbuild `spawn EPERM` 失败；容器内可执行。旧的未引用文件 `scripts/reset-admin.ts` 删除被 Windows 拒绝，后续文件锁解除后移除。

### 已完成：后台权限验收

- 目标：系统化验证未登录、普通用户、管理员三种角色访问后台页面和 API 的行为。
- 涉及文件：`lib/permissions.ts`、`middleware.ts`、`scripts/permission-smoke.js`、`package.json`。
- 验收条件：未登录跳登录，普通用户 403，管理员可访问；普通用户直接调用后台 API 返回 403。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`docker compose up -d --build app`、`npm run test:permissions`。
- 结果：权限 smoke test 已通过；后台 API 未登录返回 401，普通用户返回 403，管理员返回 200。
- 风险：`middleware.ts` 在 Next 16 中提示约定已弃用，后续仍应迁移到 `proxy.ts`，但本轮未处理该独立问题。

## P1：当前主要开发任务

### 已完成：Markdown 编辑器完善

- 目标：将 textarea 工具栏升级为更完整的 Markdown 编辑体验，支持预览、代码块语言、快捷键和更可靠的自动保存状态。
- 涉及文件：`components/admin-content-form.tsx`、`components/markdown-preview.tsx`。
- 验收条件：编辑内容不会丢失；代码块可选择语言；保存状态准确；移动端可编辑。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`docker compose up -d --build app`、`npm run test:permissions`。
- 结果：后台内容表单支持编辑/预览/分屏模式、代码块语言选择、快捷键、清除格式、扩大编辑区域和安全 React 预览；自动保存增加旧请求忽略保护。
- 风险：未引入第三方富文本编辑器；前台详情页和独立管理员预览页的 Markdown 渲染仍由下一项任务处理。

### 已完成：前台 Markdown 渲染与代码高亮

- 目标：前台详情和后台预览正确渲染 Markdown，并防止 XSS。
- 涉及文件：`components/markdown-preview.tsx`、`app/contents/[slug]/page.tsx`、`app/admin/content/[id]/preview/page.tsx`、`app/globals.css`、`scripts/markdown-smoke.js`。
- 验收条件：标题、列表、引用、链接、图片、代码块正常显示；危险 HTML 不执行。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`docker compose up -d --build app`。
- 结果：统一渲染组件已接入前台详情、管理员预览和后台编辑器预览；支持 GFM 表格、任务列表、自动链接、代码语言标记、代码复制按钮和安全过滤。
- 限制：代码高亮使用 Prism Light 注册常用语言；`structured-text` 按纯文本显示。预览页仍未实现短期预览令牌。

### 已完成：分类移动后删除

- 目标：分类下存在内容时支持移动到其他分类后删除。
- 涉及文件：`app/api/admin/categories/[id]/route.ts`、`components/admin-taxonomy-client.tsx`、`scripts/category-delete-smoke.js`。
- 验收条件：不能产生无效分类引用；操作有二次确认和日志。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`docker compose up -d --build app`。
- 结果：有关联内容的分类直接删除会失败；选择目标分类后，服务端事务内移动内容并删除原分类，操作日志写入，内容分类更新成功。
- 风险：后台 UI 目前使用浏览器原生 `confirm` 做二次确认，后续可替换为统一弹窗组件。

### 已完成：标签合并

- 目标：支持将重复标签合并到目标标签。
- 涉及文件：`app/api/admin/tags/*`、`components/admin-taxonomy-client.tsx`、`scripts/tag-merge-smoke.js`、`package.json`。
- 验收条件：内容关联迁移成功，重复关系不报错，源标签删除。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:tag-merge`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`docker compose up -d --build app`。
- 结果：后台标签管理可选择目标标签合并；服务端事务内迁移 `ContentTag` 关联，重复关系自动跳过，源标签删除并写入操作日志。
- 风险：后台 UI 目前使用浏览器原生 `confirm` 做二次确认，后续可替换为统一弹窗组件。

## P2：功能增强（已完成）

P2 阶段已完成并提交：

- `c62bb3a feat: harden image uploads`
- `a827617 chore: document safe docker cleanup`
- `4013576 fix: improve Windows build cleanup`
- `6bbf57b test: add playwright e2e coverage`

P2 总体验收已在 2026-07-04 执行。代码、类型、权限、Markdown、分类删除、上传和基础 Playwright E2E 验收均通过；Docker app 构建复验仍受 Docker Hub EOF/网络问题影响，未进入项目编译阶段。

### 已完成：上传安全增强

- 目标：增加图片宽高检查、删除接口、对象存储适配层。
- 涉及文件：`services/storage.ts`、`app/api/admin/uploads/route.ts`、`Dockerfile`、`docker-compose.yml`、`scripts/upload-smoke.js`、`package.json`、`.env.example`。
- 验收条件：非图片、超大图片、伪装图片、普通用户上传均失败。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:upload`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`git diff --check`。
- 结果：上传服务新增本地存储适配层，上传前解析 JPG/PNG/WEBP 宽高并限制默认最大 4096x4096；`DELETE /api/admin/uploads` 可删除受控上传图片；验收覆盖未登录 401、普通用户 403、伪装图片失败、超宽图片失败、非法删除路径失败、管理员上传和删除。
- 限制：对象存储只完成适配接口和本地实现，R2/S3/OSS/COS 外部 Provider 尚未接入。

### 已完成：Playwright E2E 测试

- 目标：建立稳定、可重复运行的基础浏览器端到端测试，覆盖登录、后台权限、内容主流程、上传和分类移动后删除。
- 涉及文件：`playwright.config.ts`、`tests/e2e/*`、`package.json`、`README.md`、`docs/PROJECT_STATUS.md`。
- 验收条件：测试可在本地和 CI 执行，失败能定位问题。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`npm run test:upload`、`npm run test:e2e`、`git diff --check`。
- 结果：新增 `test:e2e`、`test:e2e:ui`、`test:e2e:headed`；E2E 覆盖未登录/普通用户/管理员后台权限，内容草稿、发布、下架、回收站恢复，Markdown 前台渲染，上传权限与合法图片上传，分类移动后删除。
- 限制：未覆盖完整批量操作、所有后台 UI 表单细节、对象存储上传、跨浏览器矩阵和 CI 数据库初始化；测试依赖可访问的本地或 Docker 服务，默认 `PLAYWRIGHT_BASE_URL=http://localhost:3000`。

### 已完成：Windows `.next-final` 文件锁问题

- 目标：解决本机 `npm run build` 失败。
- 涉及文件：`package.json`、`next.config.ts`、`Dockerfile`、`.gitignore`、`tsconfig.json`、`scripts/clean-build.js`、`README.md`、`docs/PROJECT_STATUS.md`。
- 验收条件：Windows 本机 `npm run build` 可执行；Docker build 继续通过。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run clean`、`npm run build`、`docker compose up -d --build app`、`git diff --check`。
- 结果：`.next-final` 来源确认是 `next.config.ts` 的 `distDir`；Docker 通过 `NEXT_DIST_DIR=.next-final` 继续使用该目录，本机默认使用 `.next-local-build`，避免历史 `.next-final` 文件锁阻断本机构建；新增跨平台 `npm run clean`，清理 `.next`、`.next-build`、`.next-final`、`.next-local-build`、`out`、`tsconfig.tsbuildinfo`，Windows 下可先隔离到 `.cleanup-stale/`，并在 EPERM/EBUSY/ENOTEMPTY 时输出中文文件锁排查提示。
- 验证结果：受限 shell 中普通权限 `npm run clean` 仍被旧构建目录 EPERM 阻止，普通权限 `npm run build` 出现 `spawn EPERM`；使用完整本机权限后 `npm run clean` 和 `npm run build` 均通过。Docker app 构建当前被 Docker Hub/npm 网络 EOF/ECONNRESET 阻塞，未进入项目编译错误。
- 风险：当前机器旧构建目录仍可能被外部进程或安全软件锁定；如果普通权限 clean 失败，需要关闭占用或使用完整本机权限。Docker 构建需网络恢复后重试。

### 已完成：Docker 空间安全清理脚本和文档

- 目标：增加安全查看和清理 Docker 占用的维护入口，避免误删数据库、证书或上传文件。
- 涉及文件：`AGENTS.md`、`README.md`、`package.json`、`docs/PROJECT_STATUS.md`、`docs/ARCHITECTURE.md`、`docs/DECISIONS.md`。
- 验收条件：能查看 Docker 空间占用；能安全清理构建缓存；不会自动删除 volume；不会删除数据库数据；README 或 docs 中说明如何手动判断 volume 是否可以删除。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run docker:df`、`git diff --check`。
- 结果：新增安全 npm scripts：`docker:df`、`docker:df:detail`、`docker:clean:build-cache`、`docker:clean:images`、`docker:clean:containers`；README 和 docs 已说明默认只清理构建缓存、dangling images、已停止临时容器，不自动清理 volume。
- 风险：Docker volume 可能保存 PostgreSQL 数据、Caddy 证书和用户上传文件，误删会造成数据丢失；本任务未新增任何 volume 清理脚本。

## P3：下一阶段候选任务

P3 任务仅为后续计划，本次不开发。开始任一项前仍需按 `AGENTS.md` 读取项目文档并只处理一项独立任务。

### 已完成：听歌模块第一版

- 目标：增加学习、阅读、编程时使用的轻量背景音乐播放器，不做大型音乐平台。
- 涉及文件：`prisma/schema.prisma`、`prisma/migrations/20260705000000_music_module/`、`services/music.ts`、`app/music/page.tsx`、`app/admin/music/page.tsx`、`app/api/music/*`、`app/api/admin/music/*`、`components/music/*`、`components/admin-music-client.tsx`、`scripts/music-smoke.js`。
- 验收条件：游客只能看到已发布音乐；未发布和软删除音乐不暴露；普通用户不能访问后台音乐接口；管理员可新增、编辑、软删除；非法音频 URL 被拒绝；首页推荐接口只返回已发布推荐音乐；播放量接口不暴露未发布音乐。
- 结果：新增顶部右侧圆形音乐入口、`/music`、全站迷你播放器和 `/admin/music`；新增 `MusicTrack` 模型和正式迁移；后台加入版权提示。
- 限制：支持填写合法音频 URL 及管理员受控上传音频；暂不支持转码、歌词、播放列表持久化或音乐收藏。
- 需要运行：`npx prisma validate`、`npx prisma generate`、`npx prisma migrate deploy`、`npm run lint`、`npx tsc --noEmit`、`npm run test:music`，并按本轮要求复跑既有 smoke/E2E。

### 已完成：音乐入口改为顶部圆形图标

- 目标：弱化首页音乐入口，将前台音乐入口移动到顶部右侧圆形音乐图标。
- 涉及文件：`components/header.tsx`、`components/music/mini-player.tsx`、`components/music/music-player.tsx`、`app/page.tsx`。
- 结果：顶部右侧音乐图标点击后展开右下角迷你播放器，不自动播放；`/music` 页面和后台音乐管理保持不变；首页大块音乐推荐区域已移除。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:music`、`git diff --check`。
- 备注：额外尝试 E2E 时被注册接口 429 限流阻断，非本次 UI 改动路径。

### 已完成：本机 Codex CLI DeepSeek 模型目录接入

- 目标：让本机 Codex CLI 的 `/model` 模型列表出现 DeepSeek 模型。
- 涉及文件：本机 `C:\Users\62342\.codex\config.toml`、`C:\Users\62342\.codex\deepseek-model-catalog.json`。
- 结果：已追加 DeepSeek provider，并保留原 OpenAI 模型目录；`codex debug models` 已确认包含 `deepseek-chat` 和 `deepseek-reasoner`；当前默认模型已固定为 `deepseek-chat` + `model_provider = "deepseek"`。
- 稳定性修复：已移除全局 `model_reasoning_effort` 和旧 `gpt-5.5` 可用性提示，避免启动时在 OpenAI 默认模型与 DeepSeek 模型之间自动切换；`deepseek-reasoner` 仅保留为手动推理模型。
- 限制：未写入 API Key；使用前需设置 `DEEPSEEK_API_KEY`。当前 `codex-cli 0.142.5` 要求自定义 provider 使用 `wire_api = "responses"`，若 DeepSeek 端不支持 `/v1/responses`，需要额外兼容代理。
- 已运行：`codex debug models`、`codex doctor`。

### 已完成：标签合并高级完善或验收

- 目标：在已完成的标签合并基础上补充更细的 UI 状态、批量选择或冲突提示验收。
- 验收条件：合并前后内容关联、重复关系跳过、操作日志和错误提示均有自动化覆盖。
- 风险：不要改动已通过的标签合并事务逻辑，除非测试暴露真实缺陷。
- 结果：保留原有事务迁移逻辑；后台合并面板新增不可撤销提示、明确的目标标签、提交锁、加载状态和迁移/重复跳过统计反馈，移除额外浏览器 `confirm`；合并按钮改用图标并提供标题提示。
- 自动化覆盖：新增目标标签不存在、合并后重复请求、后台操作日志页面记录断言；原有合并到自身、关联迁移、重复关系跳过和源标签删除断言继续通过。
- 已运行：`npx eslint components/admin-taxonomy-client.tsx scripts/tag-merge-smoke.js`、`npx tsc --noEmit`、`npm run test:tag-merge`、`git diff --check`。
- 收尾修复：`eslint.config.mjs` 已显式忽略 Next.js 构建目录、Playwright 报告、测试结果和依赖目录，避免全量 lint 扫描生成文件；`.gitignore` 已包含对应规则，无需修改。
- 恢复后复验：2026-07-12 恢复独立的 `docker/Caddyfile` 域名改动后运行 `npm run test:e2e`，Chromium 4/4 用例通过；标签合并任务保持完成状态，本次未进入后续功能开发。

### 已完成：对象存储 Provider 接入

- 目标：接入 Cloudflare R2 / S3 兼容存储 Provider，复用现有 `StorageService` 适配层。
- 验收条件：本地上传仍可用；R2/S3 配置缺失时不会影响本地开发；上传、删除和 URL 生成均有测试。
- 风险：不能提交访问密钥、Token 或真实 bucket 配置；迁移已有上传文件前必须有备份方案。
- 结果：保留默认 local Provider，新增 AWS SDK v3 驱动的 S3/R2 Provider；上传 API 返回 `url`、`key`、`provider`，删除兼容旧 URL 并支持受控 key。
- 配置：通过 `STORAGE_PROVIDER`、`LOCAL_UPLOAD_*` 和 `S3_*` 环境变量选择 Provider；S3/R2 缺少必要配置时明确报错，不静默回退。
- 测试：`npm run test:upload` 保留原 HTTP 安全验收，并新增临时目录 local 测试、缺失配置测试和注入 fake client 的 S3/R2 上传删除测试，不需要真实云凭据。
- 限制：不自动迁移既有 `uploaded-files` 内容；正式切换前需要备份、公开域名和旧 URL 兼容方案。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:upload`、`git diff --check`、`docker compose exec -T app npx prisma migrate deploy`、构建前后 `docker system df`。
- Docker 验证：app 构建两次被 npm registry 下载 `zwitch` 的 `ECONNRESET` 阻断，未进入项目编译；现有容器和 volume 未受影响，待网络恢复后重试相同构建。
- 构建网络收尾：Dockerfile 已增加可配置 `NPM_CONFIG_REGISTRY`、npm fetch 重试/超时参数和 BuildKit npm 下载缓存，Compose 默认使用官方源，也允许通过未提交的 `.env` 临时切换镜像源；不改变应用运行时逻辑。
- 验证结果：临时切换 `npmmirror` 后 build arg 已生效，但 Docker 内同一 `zwitch` 下载仍发生 `ECONNRESET`；确认剩余阻塞位于 Docker 网络/代理层。旧容器继续运行，未清理 volume，网络修复后可直接重试构建。
- R2 真实联调（2026-07-13）：Docker 网络恢复后 app 已重新构建。容器内 R2 配置和 AWS SDK 均已确认；管理员真实上传返回 `provider: r2` 和 R2 公共 URL，URL 删除前返回 200，删除 API 成功后返回 404。未暴露或提交任何密钥。
- 上传冒烟测试已兼容 Provider 语义：local Provider 继续要求重复删除返回受控失败；S3/R2 接受 `DeleteObject` 的幂等成功响应。默认开发仍使用 local，生产可通过安全注入 `S3_*` 变量切换 R2/S3。
- Cloudflare Tunnel 公网部署（2026-07-13）：`fy-site-tunnel` Connector 为 Healthy，Service 为 `HTTP localhost:3000`；R2 真实联调已完成。`pzq1688.com` 外部 HTTPS 返回 200；`test.pzq1688.com` 当前主机 TLS 握手失败，待 Cloudflare DNS/证书状态稳定后复核，不能作为已验收公网入口。
- 上线后 URL 配置已完成：生产 `.env` 中 `NEXTAUTH_URL` 与 `NEXT_PUBLIC_SITE_URL` 已对齐为 `https://pzq1688.com`，app 已重新构建并确认容器内生效；公网首页返回 200，`/admin` 未登录跳转正常。其余安全检查结果保持正常：Docker 服务健康、R2 有效、robots/sitemap 可访问、数据库备份/恢复脚本存在、Playwright Chromium 已安装。
- R2 图片展示已修复：远程上传图片通过 `PublicImage` 使用 `unoptimized` 直连，避免 Next.js 优化器将 R2 域名解析为 `198.18.x.x` 后拒绝；首页 R2 图片浏览器复验直接加载，上传/删除测试继续通过。本地 `/uploads` 和站内静态图片仍使用优化。后续仅需在浏览器使用管理员账号完成一次登录，确认登录回调返回正式域名并可访问后台。
- 最终上线后持续维护：定期运行 Playwright E2E；为数据库、上传文件和 R2 对象建立自动备份/生命周期策略并演练恢复；补充监控与健康检查；定期查看生产日志和 Cloudflare Tunnel `fy-site-tunnel` 状态；定期使用管理员账号复核真实登录回调。日常改动遵循 `git pull` → lint/TypeScript/相关 smoke test → commit → `git push origin main`。
- 前台 UI/UX 优化：已统一首页、内容与音乐前台页面的视觉层级、响应式间距、卡片与筛选/空状态；后续以浏览器实际内容和移动端尺寸复核为准，不在视觉任务中调整业务数据、权限或存储策略。
- 前台细节修复：搜索图标已改为垂直居中并预留左侧输入空间；首页 Header 搜索输入框独立定义 `pl-12`，`/music` 筛选框使用图标与输入分离的 flex 结构，均不再受 `.input` 基础 padding 影响；三条杠保留为有效的移动导航开关；收起态迷你播放器不再显示重复的“听歌放松”文字入口，仍可通过导航音乐入口或已有曲目的圆形按钮打开。
- 后台表单防呆：新增统一必填 `※` 标签，覆盖内容、音乐、分类/标签、轮播图与公告的现有必填字段；标识与服务端 Zod 校验保持一致，可选字段不显示 `※`。
- 音频链接可靠性：已完成后台音频 URL 健康检测和前台播放失败提示。检测接口只允许管理员同源调用，拒绝私网目标，HEAD 不可用时以不读取响应体的 GET 检查回退；后续可在后台录入或编辑音频时先检测，再决定是否发布。第一版仍不支持本地音频上传。
- 本地音频上传：已完成管理员上传 MP3、M4A、OGG、WAV、FLAC 到当前 StorageProvider 的能力，成功后自动回填 `audioUrl`。默认大小上限为 50MB，可通过未提交的 `MUSIC_AUDIO_MAX_BYTES` 调整；音频 key 只允许 `audio/<uuid>.<ext>`，与图片 `covers/` 隔离。后续可评估已关联音乐删除时的音频对象生命周期管理，不应直接删除未知或非受控 key。
- MusicPlayerContext 重复实例化修复：已将 createContext 和 useMusicPlayer 从 `music-player.tsx` 提取到独立模块 `components/music/music-player-context.tsx`，解决 Webpack 代码分割导致 layout chunk 和 page chunk 各自持有独立 Context 实例的问题。`/music` 页面歌曲卡片和 MiniPlayer 现在共享同一个播放器状态。
- 导航栏音乐面板：顶部音乐按钮已不再只打开空的 MiniPlayer 控制区；它会加载前 8 首已发布音乐，提供当前播放控制、歌曲列表、加载/失败/空状态和 `/music` 全部音乐入口，点击歌曲使用共享 `playTrack(track, tracks)` 播放。
- 音乐播放器 UI：导航音乐面板保留低高度、图标优先的横向控制布局；全站底部 MiniPlayer 已卸载，原有播放、暂停、上一首、下一首、进度和桌面音量逻辑仍保留在共享播放器 Context 中，供导航面板与 `/music` 使用。收藏心形仅作禁用视觉预留，后续如需收藏必须复用现有收藏模型或另行设计，不在本次实现。
- 导航音乐面板体验：歌曲列表已从紧凑控制面板中移除，统一从“查看全部音乐”进入 `/music`；首次打开且无当前歌曲时，优先选择首页推荐曲目，为空时回退到公开音乐列表。如果浏览器拦截自动播放，则只选中曲目供用户手动播放，不显示错误的音频失效提示。控制按钮点击区域已放大；后续只需在真实移动端实例中复核按钮间距与浏览器自动播放策略。
- 标签文章草稿：第一阶段的 94 篇批量生成草稿已因可读性不足被人工清空。后续不应重跑通用模板，而应先选定少量核心主题，编写具体问题、真实示例和可验证步骤后再小批量导入为 `DRAFT`。
- 全站底部播放器：已从 `Providers` 移除 `MiniPlayer` 挂载，以消除固定底部播放条和浮动按钮。后续播放入口保留在顶部导航音乐按钮和 `/music`；不应删除共享播放器 Context 或后台音乐管理。
- 搜索与音乐播放：全局 `MusicPlayerProvider` 保留隐藏的单一音频实例，不需新增另一个 Audio Core。顶部搜索已使用 `router.push` 执行客户端导航，避免原生表单导航重建全部页面而中断播放。后续保持此约束：搜索不得主动暂停或清空当前歌曲。
- `/music` 筛选与播放：筛选表单已改为客户端 `MusicFilterForm`，使用 `router.push(..., { scroll: false })` 更新 `q`、`category` 参数，避免原生 GET 表单整页导航中断根级音频实例。筛选只影响列表，不应暂停、清空当前歌曲或改写现有播放队列；只有用户主动点击筛选后的其他歌曲时才切换队列。
- 音乐自动续播：共享播放器默认使用 `repeat-all` 列表循环，歌曲结束后读取当前队列播放下一首，最后一首回到第一首；支持在导航音乐面板切换 `order` 顺序播放和 `repeat-one` 单曲循环。后续改动不得让 `ended` 监听器读取初次挂载时的旧队列。
- 学习资料导入：`docs/CONTENT_IMPORT_PLAN.md` 已整理 50 条官方资料候选。后续仅能按小批量草稿人工导入，先确认分类/标签、slug、外链与版权说明，再由管理员审核发布；不得用脚本或接口绕过审核批量写入。
- 学习资料导入脚本：先运行 `npm run import:content-plan:dry` 查看创建与跳过数量；确认后运行 `npm run import:content-plan`，脚本只写入 `DRAFT` 内容。导入后需在后台抽查正文、分类、标签、来源链接和草稿状态，再人工审核发布。
- 学习资料导入结果：50 条候选已导入为草稿。下一步是在 `/admin/content` 按分类抽查摘要、原创导读、`officialUrl`、标签和草稿状态，逐条审核后才允许发布。

### 更完整的 Playwright 覆盖

- 目标：扩展 E2E 到批量操作、用户收藏、搜索筛选、回收站永久删除和更多后台表单细节。
- 验收条件：测试数据继续使用 `E2E_TEST_` 前缀并只清理自身数据；失败截图和 trace 仍被忽略。
- 风险：测试不能依赖生产数据，不能清空数据库。

### CI 自动化测试

- 目标：在 CI 中运行 lint、TypeScript、smoke tests 和 Playwright E2E。
- 验收条件：CI 能初始化测试数据库、安装 Playwright 浏览器并上传失败报告。
- 风险：CI 密钥和测试账号必须通过安全变量注入。

### 已完成：重装前本地备份

- 目标：在重装电脑前创建项目外本地备份目录，保存 `.env`、关键文档、Git HEAD、PostgreSQL 数据库备份、上传文件和恢复步骤。
- 结果：备份目录为 `D:\fy-site-backup\fy-site-20260705-123524`；已生成 `database/fy_site.dump`、`uploaded-files/uploads`、`RESTORE_STEPS.md`、`GIT_HEAD.txt` 和 `GIT_STATUS_SHORT.txt`。
- 备注：已新增 `docs/HANDOFF_SNAPSHOT.md`，用于重装前 GitHub 交接和恢复指引。
- 安全约束：未运行 `prisma migrate reset`、未运行 `docker volume prune`、未删除任何 Docker volume；备份目录位于项目外，不进入 Git。

### 网站内容运营功能

- 目标：完善公告、轮播图、站点设置等运营后台保存和前台读取能力。
- 验收条件：管理员可编辑，前台展示生效，权限和操作日志完整。
- 风险：缓存策略要避免修改后不生效。

### sitemap / robots / SEO 验收

- 目标：系统验收 sitemap、robots、metadata 和内容 SEO 字段前台使用。
- 验收条件：公开内容进入 sitemap，草稿/下架/软删除内容不暴露，详情页使用 SEO 标题和描述。
- 风险：不要让后台预览或私有内容被搜索引擎索引。

### 已完成：生产部署检查清单

- 目标：整理上线前检查项，包括环境变量、数据库迁移、Docker volume、备份、Caddy HTTPS、管理员账号和回滚。
- 验收条件：README 或 docs 中有可执行清单，并标明危险操作禁止项。
- 结果：已新增 `docs/PRODUCTION_CHECKLIST.md`，README 已链接该清单；清单覆盖生产环境变量、管理员账号、Docker volume 保护、上传持久化、Caddy HTTPS、迁移、备份恢复、日志、验收测试和回滚。
- 风险：部署文档不能包含密码、Token 或真实私密配置；正式上线前仍需人工确认 DNS、服务器端口、生产 `.env`、备份和 Docker 构建网络。

### 忘记密码和用户注销

- 目标：补完整账号生命周期。
- 涉及文件：`app/forgot-password/page.tsx`、`app/api/profile/route.ts`、新 reset API。
- 验收条件：可请求重置、使用令牌改密码、用户可注销。
- 需要运行：认证相关测试。
- 风险：邮件服务和令牌安全策略需要明确。

### 网站设置后台编辑

- 目标：允许管理员修改站点名称、描述、联系方式等。
- 涉及文件：`app/admin/settings/page.tsx`、新设置 API。
- 验收条件：设置保存到数据库，前台读取生效。
- 需要运行：设置 API 和页面验证。
- 风险：缓存策略要避免设置修改后不生效。
