# Project Status

最后更新：2026-07-04

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
- 图片上传：`/api/admin/uploads` 支持 JPG/JPEG/PNG/WEBP，本地保存到 `public/uploads/covers`，有大小、MIME、文件签名和宽高校验；管理员可删除受控上传图片，存储服务已有本地适配层。
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
- P2 运维与质量增强：上传安全增强、Docker 空间安全清理脚本和文档、Windows `.next-final` 构建清理、基础 Playwright E2E 测试均已完成并提交。
- 生产部署检查清单：`docs/PRODUCTION_CHECKLIST.md` 已整理生产环境变量、管理员账号、Docker volume、Caddy HTTPS、迁移、备份、日志、验收和回滚检查项。

## 部分完成

- 内容预览：管理员页面可预览草稿/下架内容；尚未实现短期预览令牌。
- 标签管理：可创建、编辑、删除、颜色字段和重复标签合并；标签颜色 UI 仍较基础。
- 操作日志：内容、分类、标签、用户等写操作有记录；日志字段已扩展，但历史日志可能字段为空。
- SEO：已有 metadata、sitemap、robots、部分页面标题；内容 SEO 字段已入库，但前台详情页尚未完整使用全部 SEO 字段。
- 文件上传：本地 StorageService 已有统一适配接口；对象存储 R2/S3/OSS/COS 仍未接入。
- 测试：完成命令验证、部分接口冒烟测试和基础 Playwright E2E 套件。

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
- `/login`
- `/register`
- `/profile`
- `/admin`
- `/admin/content`
- `/admin/content/create`
- `/admin/content/[id]/edit`
- `/admin/content/[id]/preview`
- `/admin/content/trash`
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
- `/api/profile`
- `/api/admin/contents`
- `/api/admin/contents/[id]`
- `/api/admin/contents/batch`
- `/api/admin/contents/[id]/restore`
- `/api/admin/contents/[id]/purge`
- `/api/admin/uploads`
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

## 已应用的数据库迁移

- `20260703000000_init`
- `20260703010000_content_management`

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

## 当前已知错误

- Windows 本机如遇 `.next-final` 文件锁，应先执行 `npm run clean`；若仍失败，通常是 Node/Next 进程、终端、编辑器预览、文件管理器或安全软件占用构建目录，需要关闭占用后重试。本机 `npm run build` 默认使用 `.next-local-build`，旧 `.next-final` 锁定不再阻断本机构建。历史受限 shell 中普通权限 `npm run clean` 和 `npm run build` 曾分别出现 `EPERM rename/unlink` 与 `spawn EPERM`；本次 P2 总体验收中普通 shell 执行 `npm run clean` 和 `npm run build` 均已通过。
- Docker app 构建验证仍可能被外部网络阻塞：Docker Hub metadata 或 OAuth token 请求出现 EOF，重试时也曾遇到 `npm ci` `ECONNRESET`；尚未发现 Dockerfile 或项目代码编译错误。
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
