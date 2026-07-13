# Project Status

最后更新：2026-07-13

完整项目说明文档：`docs/PROJECT_FULL_EXPLANATION.md`

## 已完成

- 项目基础：Next.js App Router、TypeScript、Tailwind CSS、Prisma 7、PostgreSQL、NextAuth、Zod、Docker Compose、Caddy。
- 身份认证：邮箱/账号 + 密码登录，bcrypt 哈希，NextAuth 会话，注册接口，基础登录限流。
- 权限：`requireUser`、`requireAdmin`、`requireUserApi`、`requireAdminApi` 已存在，后台页面和后台 API 使用服务端验证。
- 前台：首页、内容列表、内容详情、搜索、我的收藏、登录、注册、用户中心、隐私政策、用户协议、404/403/error/loading。
- 收藏：游客 localStorage 收藏，登录用户数据库收藏，登录后本地收藏同步，收藏唯一约束，收藏数量事务更新。
- 后台基础：控制台、内容管理、分类管理、标签管理、用户管理、轮播图管理、公告管理、网站设置展示、操作日志。
- 后台内容管理主体：
  - `/admin/content`
  - `/admin/content/create`
  - `/admin/content/[id]/edit`
  - `/admin/content/[id]/preview`
  - `/admin/content/trash`
  - `/admin/contents` 旧路径跳转兼容。
- 内容功能：服务端分页、筛选、排序、批量发布/下架/推荐/置顶/删除、创建、编辑、保存草稿、发布、下架、软删除、恢复、永久删除、管理员预览。
- 图片上传：`/api/admin/uploads` 支持 JPG/JPEG/PNG/WEBP，有大小、MIME、文件签名和宽高校验；默认保存到本地 `public/uploads/covers`，也可通过环境变量选择 Cloudflare R2 / S3 兼容对象存储。管理员只能删除受控 URL/key。
- 服务层：
  - `services/content.ts`
  - `services/storage.ts`
  - `services/operation-log.ts`
- Docker：`db`、`app`、`caddy` 服务可启动，PostgreSQL 18 数据卷挂载为 `/var/lib/postgresql`，上传文件使用 `uploaded-files` 卷挂载到 `/app/public/uploads`。
- Windows 本机构建清理：`.next-final` 来源于 `next.config.ts` 的 `distDir`；Docker 通过 `NEXT_DIST_DIR=.next-final` 继续使用该目录，本机默认改用 `.next-local-build` 避免触碰历史锁定目录；`npm run clean` 可跨平台清理 `.next`、`.next-build`、`.next-final`、`.next-local-build`、`out` 和 `tsconfig.tsbuildinfo`，Windows 下可将旧构建目录隔离到 `.cleanup-stale/`。
- 管理员默认账号安全修复：`.env.example` 已改为占位强密码，本地 `.env` 已改为非 `admin/admin`，`prisma/seed.ts` 会拒绝弱管理员配置，`npm run admin:reset` 可显式重置管理员并禁用旧 `admin` 账号。
- Git 基线：已建立首次提交；`.env`、`.env.local`、`node_modules/`、`.next/`、`.next-build/`、`.next-final/`、根目录 `/uploads/`、`public/uploads/` 和遗留 `scripts/reset-admin.ts` 不进入 Git。
- 后台权限验收：`/admin` 页面在 middleware 层校验 NextAuth JWT，未登录跳 `/login`，普通用户跳 `/403`；后台 API 在 Route Handler 中通过 `requireAdminApi()` 区分未登录 401 和非管理员 403。
- 后台 Markdown 编辑器：内容表单支持编辑/预览/分屏模式、代码块语言选择、Markdown 快捷键、清除格式、扩大编辑区域和安全 React 预览；自动保存有防抖、保存状态和旧请求忽略保护。
- 前台 Markdown 渲染：正式详情页、后台编辑器预览和管理员独立预览页统一使用 `components/markdown-preview.tsx`，支持 GitHub 风格 Markdown、表格、任务列表、代码块语言标记、代码复制按钮和安全链接/图片过滤。
- 分类移动后删除：分类下存在内容时，后台可选择目标分类，服务端在事务内移动内容并删除原分类，同时写入操作日志；直接删除仍会被阻止。
- 标签合并：后台标签管理可将源标签合并到目标标签，服务端事务内迁移 `ContentTag` 关联、跳过重复关系、删除源标签并写入操作日志。
- 标签合并高级验收：后台合并面板提供不可撤销提示、明确的目标标签、提交锁和迁移统计反馈；冒烟测试覆盖合并到自身、目标不存在、重复请求、重复关联跳过、源标签删除和操作日志记录。
- P2 运维与质量增强：上传安全增强、Docker 空间安全清理脚本和文档、Windows `.next-final` 构建清理、基础 Playwright E2E 测试均已完成并提交。
- 生产部署检查清单：`docs/PRODUCTION_CHECKLIST.md` 已整理生产环境变量、管理员账号、Docker volume、Caddy HTTPS、迁移、备份、日志、验收和回滚检查项。
- 听歌模块第一版：
  - 定位为学习、阅读、编程时的背景音乐播放器，不作为大型音乐平台。
  - 新增 `MusicTrack` 数据模型和正式迁移 `20260705000000_music_module`。
  - 新增顶部右侧圆形音乐入口、`/music` 音乐小角落、全站右下角默认收起迷你播放器。
  - 新增 `/admin/music` 后台音乐管理，支持新增、编辑、软删除、启用/禁用、首页推荐、排序、封面 URL/图片上传复用、音频 URL 和预览播放。
  - 新增公开 API `/api/music`、`/api/music/featured`、`/api/music/[id]/play`。
  - 新增后台 API `/api/admin/music`、`/api/admin/music/[id]`。
  - 音频支持填写合法可外链 URL，也支持管理员上传受控的 MP3、M4A、OGG、WAV、FLAC；后台和 README 已补版权与授权提示。
  - 新增 `npm run test:music` / `scripts/music-smoke.js` 覆盖公开读取、发布过滤、后台权限、增改软删、非法 URL、推荐接口和播放量基础防刷。
  - MusicPlayerContext 已提取到独立模块 `components/music/music-player-context.tsx`，修复 Webpack 代码分割导致 Context 在两个 chunk 中重复实例化的问题；`/music` 页面歌曲卡片和 MiniPlayer 现在共享同一个播放器状态。
  - 顶部音乐按钮已接入独立歌曲面板：调用公开 `/api/music?pageSize=8` 展示已发布歌曲，点击歌曲复用共享 Context 的 `playTrack(track, tracks)`；面板保留当前播放控制、加载/失败/空状态和“查看全部音乐”链接。
  - 音乐播放器 UI 已调整为轻量横向控制条：导航面板使用紧凑队列和图标控制，底部 MiniPlayer 保留细进度线、歌曲信息、上一首/播放/下一首和 `/music` 列表入口；心形图标仅为禁用的收藏预留，不新增业务功能。
  - 导航音乐面板进一步简化：移除控制区下方的重复歌曲列表，队列、上一首、下一首与播放按钮提高至至少40px命中区域；在没有当前歌曲时，首次打开会优先从 `/api/music/featured` 选择第一首推荐曲目并使用现有 `playTrack` 开始播放；无推荐时回退到公开音乐列表。若浏览器拦截自动播放，会保留已选曲目而不误报为音频失效，用户可再点击播放。
  - 按标签生成文章草稿：新增 `scripts/generate-tag-article-drafts.ts` 和 `npm run generate:tag-articles:dry` / `npm run generate:tag-articles`。脚本从数据库读取标签，使用稳定 slug 保证幂等，只创建 `ARTICLE` / `DRAFT` 并写入管理员审计信息和操作日志。第一阶段已对当前 94 个 Tag 各创建 1 篇草稿：实际创建 94，跳过 0，全部正文不少于 5000 字符、slug 唯一且每篇仅关联对应标签；均未发布。

## 部分完成

- 内容预览：管理员页面可预览草稿/下架内容；尚未实现短期预览令牌。
- 标签管理：可创建、编辑、删除、颜色字段和重复标签合并；标签颜色 UI 仍较基础。
- 操作日志：内容、分类、标签、用户等写操作有记录；日志字段已扩展，但历史日志可能字段为空。
- SEO：已有 metadata、sitemap、robots、部分页面标题；内容 SEO 字段已入库，但前台详情页尚未完整使用全部 SEO 字段。
- 文件上传：local 与 S3/R2 Provider 已接入；尚未自动迁移既有本地图片，也未接入 OSS/COS 专用 SDK（可通过其 S3 兼容接口时复用现有 Provider）。
- 测试：完成命令验证、部分接口冒烟测试和基础 Playwright E2E 套件。
- 听歌模块：当前支持受控本地音频上传，但暂不支持转码、歌词、播放列表保存和收藏系统接入；音乐喜欢/收藏未强行复用内容收藏系统。
- 音频链接可靠性：后台音乐表单的音频 URL 字段可调用 `/api/admin/music/check-audio-url` 检测。接口仅限管理员和同源请求，限制公开 `http/https` 地址，拒绝本机/私网解析结果，5 秒超时，优先 HEAD，必要时以取消响应体的 GET 回退；结果显示 HTTP 状态、内容类型和正常/失效原因。前台原生 Audio 触发错误时会提示“音频链接可能已失效或暂时无法播放，请稍后再试”，切换歌曲时清除提示。
- 本地音频上传：后台音乐表单支持上传 MP3、M4A、OGG、WAV、FLAC；上传 API 为 `/api/admin/music/upload-audio`，仅管理员同源请求可用。音频经过 MIME、文件头和默认 50MB 限制校验后，使用当前 StorageProvider 写入 `audio/<uuid>.<ext>`，成功 URL 自动填入既有 `MusicTrack.audioUrl`；`r2`/`s3` 写入对象存储，`local` 写入 `public/uploads/audio`。图片仍只使用 `covers/` 路径。

## 未开始

- 忘记密码/重置密码完整邮件流程。
- 用户注销账号。
- 网站设置后台编辑保存。
- 内容列表卡片/列表视图切换、骨架屏、请求失败重试按钮。
- 生产监控、告警和独立 app HTTP healthcheck。

## 存在问题

- 当前 Windows 本机执行 `npm run admin:reset` 会因 `tsx`/esbuild `spawn EPERM` 失败；Docker 容器内执行成功。当前管理员重置统一通过 `docker compose exec -T app npm run admin:reset` 执行。
- 本轮早期创建的旧脚本 `scripts/reset-admin.ts` 已不再被 `package.json` 引用，但 Windows 拒绝删除该文件；已加入 `.git/info/exclude` 做本地排除，不提交到仓库，后续可在文件锁解除后移除。
- `middleware.ts` 仍存在，Next 16 提示该约定已弃用，建议后续迁移到 `proxy.ts`；之前删除/改名被 Windows 权限拒绝过。
- 收藏表对内容是 cascade 删除；软删除内容可保留收藏，永久删除会删除收藏。

## Docker 空间占用与清理

- Docker 空间会随着构建、测试和镜像增长。
- 主要占用来源是 Docker 镜像、Docker 构建缓存、停止容器和 Docker volume。
- 当前项目存在上传文件持久化卷：`uploaded-files:/app/public/uploads`。
- `uploaded-files` 保存用户上传图片，不允许自动清理。
- PostgreSQL 数据 volume、Caddy 数据和证书 volume 也不允许自动清理。
- 当前推荐优先清理构建缓存、dangling images、已停止且确认不再需要的临时容器。
- volume 清理必须人工确认 volume 名称和用途，并在数据库、上传文件等关键数据已有备份且用户明确同意后才能执行。
- 已增加安全 npm scripts 和 README 运维说明；不会提供自动清理 volume 的脚本。

## 当前可访问页面

- `/`
- `/contents`
- `/contents/[slug]`
- `/search`
- `/favorites`
- `/music`
- `/login`
- `/register`
- `/profile`
- `/admin`
- `/admin/content`
- `/admin/content/create`
- `/admin/content/[id]/edit`
- `/admin/content/[id]/preview`
- `/admin/content/trash`
- `/admin/music`
- `/admin/categories`
- `/admin/tags`
- `/admin/users`
- `/admin/banners`
- `/admin/announcements`
- `/admin/settings`
- `/admin/logs`

## 当前已有 API

- `/api/auth/[...nextauth]`
- `/api/auth/register`
- `/api/favorites`
- `/api/music`
- `/api/music/featured`
- `/api/music/[id]/play`
- `/api/profile`
- `/api/admin/contents`
- `/api/admin/contents/[id]`
- `/api/admin/contents/batch`
- `/api/admin/contents/[id]/restore`
- `/api/admin/contents/[id]/purge`
- `/api/admin/uploads`
- `/api/admin/music`
- `/api/admin/music/[id]`
- `/api/admin/categories`
- `/api/admin/categories/[id]`
- `/api/admin/tags`
- `/api/admin/tags/[id]`
- `/api/admin/tags/[id]/merge`
- `/api/admin/users/[id]`
- `/api/admin/banners`
- `/api/admin/banners/[id]`
- `/api/admin/announcements`
- `/api/admin/announcements/[id]`

## 当前 Prisma 模型和枚举

枚举：

- `UserRole`
- `UserStatus`
- `ContentStatus`
- `ContentType`
- `LogAction`

模型：

- `User`
- `Account`
- `Session`
- `VerificationToken`
- `Category`
- `Tag`
- `Content`
- `ContentResourceDetail`
- `ContentTag`
- `Favorite`
- `Banner`
- `Announcement`
- `SiteSetting`
- `OperationLog`
- `PasswordResetToken`
- `SearchTerm`
- `MusicTrack`

## 已应用的数据库迁移

- `20260703000000_init`
- `20260703010000_content_management`
- `20260705000000_music_module`

Docker 日志确认 `20260703010000_content_management` 已应用成功。

## 当前 Docker 服务

- `website-db-1`：PostgreSQL 18，healthy。
- `website-app-1`：Next.js standalone app，端口 `3000:3000`。
- `website-caddy-1`：Caddy，端口 `80`、`443`。
- `website_uploaded-files`：上传文件持久化卷，挂载到 app 容器 `/app/public/uploads`。

## 已通过的验证命令

- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run lint`
- `docker compose up -d --build app`
- `docker compose exec -T app npx prisma migrate deploy`
- `docker compose exec -T app npm run admin:reset`
- `npm run test:permissions`
- `docker compose up -d --build app`
- `npm run test:markdown`
- `npm run test:category-delete`
- `npm run test:tag-merge`
- `npm run test:upload`
- `npm run docker:df`
- `npm run clean`
- `npm run build`
- `npm run test:e2e`

P2 总体验收（2026-07-04）：

- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`npm run test:upload`、`npm run test:e2e`、`npm run docker:df`、`npm run clean`、`npm run build`、`git diff --check`。
- Docker app 构建复验未通过：`docker compose up -d --build app` 停在 Docker Hub OAuth token 获取，错误为 `Post "https://auth.docker.io/token": EOF`；未进入项目依赖安装或 Next.js 编译阶段，当前按外部网络问题记录。
- `npm run docker:df` 显示当前主要可回收空间来自 Docker build cache；未执行任何 Docker 清理命令，也未清理 volume。

接口冒烟验证：

- `admin@pzq1688.local` 登录成功并可访问 `/admin`。
- 旧 `admin/admin` 登录返回 401。
- 未登录访问 `/admin` 会跳转 `/login`；普通用户访问 `/admin` 会跳转 `/403`；普通用户调用 `/api/admin/contents` 返回 403；管理员调用返回 200。
- Markdown 冒烟测试通过：GFM 表格、任务列表、行内代码、代码块语言、未知语言降级、复制按钮、安全外链、危险链接降级、原始 HTML 过滤、草稿/下架/软删除前台不可访问、管理员预览不增加浏览量。
- 分类移动删除验收通过：有关联内容的分类直接删除会失败；选择目标分类后可移动内容并删除原分类；内容分类已更新。
- 标签合并验收通过：源标签关联迁移到目标标签，重复关联被跳过，源标签被删除。
- 上传验收通过：未登录上传返回 401，普通用户上传返回 403，伪装图片、超宽图片和非法删除路径被拒绝，管理员上传返回图片宽高，管理员可删除受控上传图片。
- Playwright E2E 覆盖：未登录/普通用户/管理员后台权限，内容草稿、发布、下架、回收站恢复，Markdown 前台渲染，上传权限与合法图片上传，分类移动后删除。
- 管理员创建内容成功。
- 发布后前台详情页返回 200。
- 下架成功。
- 软删除、恢复、永久删除成功。

听歌模块验收（2026-07-05）：

- 已通过：`npx prisma validate`、`npx prisma generate`、`docker compose exec -T app npx prisma migrate deploy`、`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`npm run test:upload`、`npm run test:e2e`、`npm run test:music`、`git diff --check`。
- 已执行：`docker compose up -d --build app`，用于让运行中的 Docker app 容器包含本轮新增音乐模块；构建和 Next.js 编译通过。
- 已按规则在 Docker 构建前后运行 `npm run docker:df`；构建后主要可回收空间仍来自 Docker build cache，未执行任何 Docker 清理命令，也未清理 volume。
- 宿主机直接执行 `npx prisma migrate deploy` 失败：当前 Docker PostgreSQL 未映射宿主 `localhost:5432`，容器内迁移验收已通过并使用当前 app 镜像中的 3 个迁移。

音乐入口 UI 调整（2026-07-05）：

- 已将首页大块“听歌放松”推荐区域和导航文字“听歌”改为顶部右侧圆形音乐图标入口；`/music` 页面和右下角迷你播放器保留。
- 顶部音乐图标位于 `components/header.tsx` 的右侧按钮区，点击只展开迷你播放器，不自动播放。
- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:music`、`git diff --check`。
- 额外尝试 `npm run test:e2e`：首次失败于注册接口 429 限流；避开输出目录锁并提权重跑后仍因注册限流失败，非本次 Header/UI 改动路径。

恢复后 E2E 复验（2026-07-12）：

- `docker/Caddyfile` 已恢复为仓库中的正式域名配置，恢复前遗留的 `dev.pzq1688.com` 工作区改动未保留。
- 已运行 `npm run test:e2e`，Chromium 4/4 用例通过，共耗时 5.8 秒。
- 通过范围：后台权限边界；内容草稿、发布、下架、回收站和 Markdown 前台渲染；上传权限、合法图片和伪装文件；分类移动后删除及内容分类迁移。
- 本次仅记录恢复后验证结果，未修改业务代码、数据库结构或 Docker volume。

对象存储 Provider 验收（2026-07-12）：

- 默认 local 上传保持兼容；新增可选 `s3` / `r2` Provider，使用 AWS SDK v3，Cloudflare R2 通过自定义 endpoint 支持。
- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:upload`、`git diff --check`。上传测试同时覆盖既有 HTTP 安全流程、临时目录 local Provider、缺失 R2 配置和 fake S3 client 上传/删除。
- `docker compose exec -T app npx prisma migrate deploy` 通过：3 个迁移均已应用，无待执行迁移；本任务没有数据库 schema 变更。
- `docker compose up -d --build app` 连续两次在容器 `npm ci` 下载 `zwitch` 时因 npm registry `ECONNRESET` 失败，未进入项目编译阶段；运行中的旧 app 容器和所有 volume 保持不变。
- 构建前后已运行 `docker system df`；5 个 local volume 均 active，未执行任何 Docker 清理，build cache 约 5.67GB，其中约 4.236GB 可回收。

Cloudflare R2 真实联调（2026-07-13）：

- Docker app 已重新构建并启动；容器内 `STORAGE_PROVIDER`、全部 `S3_*` 配置均已注入（仅作 set/missing 脱敏检查），`@aws-sdk/client-s3` 已安装。首页和 `/music` 返回 200，未登录访问 `/admin` 正常跳转登录页。
- 使用管理员真实调用 `/api/admin/uploads` 验证：上传响应 `provider` 为 `r2`，返回 Cloudflare R2 公共 URL；对象删除前该 URL 返回 200，删除 API 返回 200，删除后同一 URL 返回 404，确认对象已从 bucket 删除。
- `npm run test:upload` 已按上传响应的 `provider` 区分重复删除语义：local Provider 保持不存在文件返回 400 的断言；R2/S3 接受 `DeleteObject` 对不存在对象返回 200 的幂等结果。非法路径、权限、伪装图片、宽高限制、首次上传和删除断言均保持。
- 当前默认仍建议本地开发使用 `STORAGE_PROVIDER=local`；生产环境可在安全注入 `S3_*` 凭据后切换至 `r2` 或 `s3`，不得提交真实密钥。

Cloudflare Tunnel 公网部署（2026-07-13）：

- Tunnel 名称为 `fy-site-tunnel`，Connector 状态为 Healthy，Service 指向 `HTTP localhost:3000`。R2 对象存储真实上传、公共 URL 访问和删除联调已完成。
- `https://pzq1688.com` 已通过外部 HTTPS 探测并返回 200，由 Cloudflare 提供响应。
- `https://test.pzq1688.com` 在当前 Windows 主机探测时未能完成 TLS 握手，即使忽略证书校验也失败；当前不记录为已验证可访问，需在 Cloudflare DNS/证书状态稳定后复核。
- 本次部署记录的 Git 基线为 `33f9a65 fix: align upload smoke test with r2 delete semantics`；未修改业务代码、数据库结构或 Docker volume。

上线后安全与稳定性检查（2026-07-13）：

- Docker 服务状态正常：`website-app-1` 与 `website-caddy-1` 运行中，`website-db-1` 为 healthy。容器使用 production 模式，数据库、NextAuth、管理员、R2/S3 相关必需变量均已注入（仅作 set/missing 脱敏检查）；管理员凭据不是 `admin/admin`，有效 `STORAGE_PROVIDER` 为 `r2`。
- 公网探测通过：`https://pzq1688.com` 和 `/music` 返回 200；`/admin` 返回 307 跳转 `/login`，符合未登录保护预期；`/robots.txt` 返回 200，`/sitemap.xml` 返回 200。
- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:upload`、`npm run test:music`、`git diff --check`。Playwright Chromium 已安装，本轮仅检查浏览器可用性，未执行 E2E 套件。
- 备份脚本存在：`scripts/backup-db.ps1` 和 `scripts/restore-db.ps1`；本轮未执行备份或恢复，未清理任何 Docker volume。
- 生产 URL 配置已修正：`.env` 中的 `NEXTAUTH_URL` 与 `NEXT_PUBLIC_SITE_URL` 已调整为 `https://pzq1688.com`，并已成功重建 app 容器。容器内两项配置均匹配正式域名，公网首页继续返回 200，未登录 `/admin` 继续正常跳转登录页；未修改数据库或 Docker volume。
- URL 修正后复验：重建后的 app 上 `npm run test:upload` 通过，R2 上传和删除 API 仍正常。容器日志发现 Next.js 图片优化器将 R2 公共域名解析为 `198.18.x.x` 并按私网地址拦截；该问题可能影响 R2 图片通过 `next/image` 的页面显示，需单独处理，不能与上传/删除 API 验收混为一谈。

R2 图片展示修复（2026-07-13）：

- 新增 `components/public-image.tsx`，远程 `http/https` 上传图片以 `unoptimized` 直接由浏览器加载，避免 Next.js 图片优化器将 R2 公共域名解析到 `198.18.x.x` 后按私网地址拦截；本地 `/uploads` 与站内静态图片继续使用原有优化路径。
- 已覆盖首页 Banner、前台内容卡片、音乐卡片、后台内容列表与编辑预览、后台音乐列表。浏览器复验首页 4 张 R2 图片均直接加载，未经过 `/_next/image`；新 app 日志未再出现 R2 图片优化器拦截。
- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:upload`、`git diff --check`。app 重建后容器时间已对齐，R2 上传/删除测试再次通过；本任务未修改数据库结构或 Docker volume。

最终生产上线状态（2026-07-13）：

- 正式公网域名 `https://pzq1688.com` 已可访问；首页和 `/music` 返回 200，`/admin` 对未登录用户返回 307 并跳转登录页。Cloudflare Tunnel 用于公网访问，`fy-site-tunnel` Connector 状态为 Healthy，Service 指向 `HTTP localhost:3000`。
- 生产环境使用 `NEXTAUTH_URL` 与 `NEXT_PUBLIC_SITE_URL` 指向正式域名，默认上传策略为 `STORAGE_PROVIDER=r2`；本地开发仍可改用 `STORAGE_PROVIDER=local`。R2 上传、删除与远程图片直连展示均已验收。
- 推荐维护流程：开发前 `git pull`；修改后运行 `npm run lint`、`npx tsc --noEmit` 和相关 smoke test；确认无敏感文件后提交并执行 `git push origin main`。
- 持续运维建议：定期运行 Playwright E2E、配置自动备份并演练恢复、补充监控/健康检查和生产日志查看、监控 Cloudflare Tunnel 状态、为 R2 制定对象备份或生命周期策略，并定期复核管理员真实登录回调。

前台界面 UI/UX 优化（2026-07-13）：

- 优化范围限定在首页、内容列表、音乐页、Header、内容卡片、音乐卡片、迷你播放器相关视觉样式和加载/空状态；统一容器、卡片、按钮、筛选面板、标题层级、悬停与移动端间距。
- 所有封面继续复用 `PublicImage`；远程 R2 图片保持 `unoptimized` 直连，本地图片保持既有优化策略。未修改业务逻辑、权限、上传、对象存储或数据库结构。
- 已通过：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:upload`、`npm run test:music`、`npm run test:e2e`、`git diff --check`。浏览器桌面/移动视口复验无横向溢出，首页与内容页 R2 图片继续直连加载。

前台导航与搜索细节修复（2026-07-13）：

- 搜索图标改为输入框垂直居中定位并增加左侧内边距；首页 Header 搜索输入框不再复用 `.input` 基础 padding，而是独立定义 `pl-12`。`/music` 筛选框使用图标与输入分离的 flex 结构，placeholder/输入文字不会再与图标重合。
- 三条杠按钮确认是有效的移动端导航开关，保留其展开/收起菜单行为；迷你播放器收起态移除“听歌放松”文字大按钮，仅在已有当前曲目时显示轻量圆形唤起按钮，导航栏音乐入口和完整迷你播放器功能保持。

后台表单必填标识（2026-07-13）：

- 新增统一 `AdminRequiredLabel`，以红色 `※` 标识既有服务端规则中的必填字段，同时提供屏幕阅读器“必填”文本。
- 已覆盖内容标题/Slug、音乐标题/音频 URL、分类与标签的名称/英文别名、轮播图标题/图片地址、公告标题/内容；可选字段仅保留普通标签，不显示 `※`。
- 本次不改变任何表单字段、请求载荷或 Zod 服务端校验规则。

资料导入计划（2026-07-13）：

- 已新增 `docs/CONTENT_IMPORT_PLAN.md`，基于官方或开源项目官方文档整理前端、后端与数据库、部署与运维、测试与质量、自动化学习五个方向各 10 条候选资料。
- 本轮仅生成导入计划，不写入数据库、不调用后台接口、不修改业务代码或数据库结构；全部候选默认按 `LEARNING_RESOURCE`、`DRAFT` 处理，需逐条人工审核后再导入。

资料草稿导入（2026-07-13）：

- 新增 `scripts/import-content-plan.ts` 与 `npm run import:content-plan:dry` / `npm run import:content-plan`。脚本从计划文档解析 50 条候选，按 slug 和 `ContentResourceDetail.officialUrl` 去重，只创建缺失分类、标签和草稿内容，不更新或删除已有内容。
- 已在 app 容器内先完成 dry-run（50 条可创建、0 条重复），再执行实际导入；已创建 50 条 `LEARNING_RESOURCE` 草稿，未发布、未覆盖或删除任何既有内容。

本机 Codex CLI DeepSeek 接入（2026-07-05）：

- 已在本机 `C:\Users\62342\.codex\config.toml` 追加 DeepSeek provider，并通过 `model_catalog_json` 指向 `C:\Users\62342\.codex\deepseek-model-catalog.json`。
- `codex debug models` 已确认模型目录包含 `deepseek-chat` 和 `deepseek-reasoner`，可在 `/model` 模型列表中选择。
- 已将本机默认模型固定为 `deepseek-chat`，并显式设置 `model_provider = "deepseek"`；已移除全局 `model_reasoning_effort` 和旧 `gpt-5.5` 可用性提示，避免启动时在 OpenAI 默认模型与 DeepSeek 模型之间自动切换。
- `deepseek-reasoner` 仅保留在模型目录中供需要推理时手动选择，不作为默认模型。
- 未写入 DeepSeek API Key；实际使用前需要在本机环境变量中设置 `DEEPSEEK_API_KEY`。
- 当前 `codex-cli 0.142.5` 已拒绝 `wire_api = "chat"`，DeepSeek provider 按 CLI 要求配置为 `wire_api = "responses"`；如果 DeepSeek 官方接口不支持 `/v1/responses`，实际调用需要额外的 Responses API 兼容代理。
- 配置前已生成备份：`C:\Users\62342\.codex\config.toml.bak-deepseek-20260705013409`、`C:\Users\62342\.codex\config.toml.bak-deepseek-20260705013531`、`C:\Users\62342\.codex\config.toml.bak-model-default-20260705014843`。

## 当前已知错误

## 重装前本地备份

- 2026-07-05 已创建项目外备份目录：`D:\fy-site-backup\fy-site-20260705-123524`，未放入 Git 仓库。
- 已备份 `.env`、`docs/PRODUCTION_CHECKLIST.md`、当前 Git HEAD、PostgreSQL `pg_dump` custom dump、`uploaded-files` 上传目录和 `RESTORE_STEPS.md`。
- 已新增 `docs/HANDOFF_SNAPSHOT.md`，记录项目交接、备份目录、恢复要点和禁止事项。
- 未运行 `prisma migrate reset`、未运行 `docker volume prune`、未删除任何 Docker volume。

- Windows 本机如遇 `.next-final` 文件锁，应先执行 `npm run clean`；若仍失败，通常是 Node/Next 进程、终端、编辑器预览、文件管理器或安全软件占用构建目录，需要关闭占用后重试。本机 `npm run build` 默认使用 `.next-local-build`，旧 `.next-final` 锁定不再阻断本机构建。历史受限 shell 中普通权限 `npm run clean` 和 `npm run build` 曾分别出现 `EPERM rename/unlink` 与 `spawn EPERM`；本次 P2 总体验收中普通 shell 执行 `npm run clean` 和 `npm run build` 均已通过。
- Docker app 构建验证仍可能被外部网络阻塞：Docker Hub metadata 或 OAuth token 请求出现 EOF，重试时也曾遇到 `npm ci` `ECONNRESET`；尚未发现 Dockerfile 或项目代码编译错误。
- Docker npm 网络可靠性：Dockerfile 支持通过 `NPM_CONFIG_REGISTRY` build arg 选择 registry，默认仍为 npm 官方源，并为 `npm ci` 配置重试、退避、下载超时和 BuildKit npm 下载缓存；Compose 可从未提交的 `.env` 临时传入镜像源。
- 2026-07-13 验证：Compose 语法、lint、TypeScript 和 diff 检查通过；临时传入 `https://registry.npmmirror.com` 后构建日志确认 registry 切换生效，但 Docker 内下载 `zwitch` 仍在 TLS 建连前 `ECONNRESET`。旧 app 容器和所有 volume 保持不变，需继续排查 Docker Desktop 网络/代理，而不是修改业务代码。
- Windows 本机 `npm run admin:reset` 因 `tsx`/esbuild `spawn EPERM` 失败；Docker 容器内执行成功。
- 正式上线前仍需人工确认 `pzq1688.com` DNS 指向当前服务器、80/443 可访问、生产 `.env` 使用强随机密钥、数据库和上传文件已备份，并完成生产或等价环境部署验收。

## Playwright E2E

- 配置文件：`playwright.config.ts`。
- 测试目录：`tests/e2e/`。
- 默认地址：`http://localhost:3000`，可通过 `PLAYWRIGHT_BASE_URL` 覆盖。
- 测试账号：优先读取 `E2E_ADMIN_EMAIL`、`E2E_ADMIN_PASSWORD`，未设置时回退到 `.env` 的 `ADMIN_EMAIL`、`ADMIN_PASSWORD`；普通用户可通过 `E2E_USER_EMAIL`、`E2E_USER_PASSWORD` 指定，未设置时测试生成唯一账号并走注册接口。
- 数据隔离：测试分类、内容和用户使用 `E2E_TEST_` 前缀或唯一邮箱，测试结束后仅通过受控 API 清理自己创建的数据。
- 失败输出：`test-results/`、`playwright-report/`，均已被 `.gitignore` 忽略。
- 当前未覆盖：完整批量操作、用户收藏、搜索筛选、回收站永久删除细节、所有后台表单交互细节、对象存储上传、跨浏览器矩阵和 CI 数据库初始化流程。

## 当前管理员初始化方式

- `prisma/seed.ts` 从环境变量读取：
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_NAME`
- 如果管理员已存在则跳过创建。
- 如果环境变量仍使用 `admin/admin` 等弱配置，seed 会直接失败。
- 密码使用 bcrypt 哈希。
- 需要重置已存在管理员时，先配置 `.env`，再执行 `npm run admin:reset`；Docker 环境可执行 `docker compose exec -T app npm run admin:reset`。

## 测试账号安全风险

已修复主要风险。当前本地配置不再使用 `admin/admin`，旧 `admin` 账号已被禁用；`.env.example` 使用占位密码。仍需注意 `.env` 不得进入 Git 或生产镜像公开环境。
