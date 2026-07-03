# Project Status

最后更新：2026-07-03

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
- 图片上传：`/api/admin/uploads` 支持 JPG/JPEG/PNG/WEBP，本地保存到 `public/uploads/covers`，有大小、MIME、文件签名校验。
- 服务层：
  - `services/content.ts`
  - `services/storage.ts`
  - `services/operation-log.ts`
- Docker：`db`、`app`、`caddy` 服务可启动，PostgreSQL 18 数据卷挂载为 `/var/lib/postgresql`。
- 管理员默认账号安全修复：`.env.example` 已改为占位强密码，本地 `.env` 已改为非 `admin/admin`，`prisma/seed.ts` 会拒绝弱管理员配置，`npm run admin:reset` 可显式重置管理员并禁用旧 `admin` 账号。
- Git 基线：已建立首次提交；`.env`、`.env.local`、`node_modules/`、`.next/`、`.next-build/`、`.next-final/`、根目录 `/uploads/`、`public/uploads/` 和遗留 `scripts/reset-admin.ts` 不进入 Git。
- 后台权限验收：`/admin` 页面在 middleware 层校验 NextAuth JWT，未登录跳 `/login`，普通用户跳 `/403`；后台 API 在 Route Handler 中通过 `requireAdminApi()` 区分未登录 401 和非管理员 403。
- 后台 Markdown 编辑器：内容表单支持编辑/预览/分屏模式、代码块语言选择、Markdown 快捷键、清除格式、扩大编辑区域和安全 React 预览；自动保存有防抖、保存状态和旧请求忽略保护。
- 前台 Markdown 渲染：正式详情页、后台编辑器预览和管理员独立预览页统一使用 `components/markdown-preview.tsx`，支持 GitHub 风格 Markdown、表格、任务列表、代码块语言标记、代码复制按钮和安全链接/图片过滤。
- 分类移动后删除：分类下存在内容时，后台可选择目标分类，服务端在事务内移动内容并删除原分类，同时写入操作日志；直接删除仍会被阻止。
- 标签合并：后台标签管理可将源标签合并到目标标签，服务端事务内迁移 `ContentTag` 关联、跳过重复关系、删除源标签并写入操作日志。

## 部分完成

- 内容预览：管理员页面可预览草稿/下架内容；尚未实现短期预览令牌。
- 标签管理：可创建、编辑、删除、颜色字段和重复标签合并；标签颜色 UI 仍较基础。
- 操作日志：内容、分类、标签、用户等写操作有记录；日志字段已扩展，但历史日志可能字段为空。
- SEO：已有 metadata、sitemap、robots、部分页面标题；内容 SEO 字段已入库，但前台详情页尚未完整使用全部 SEO 字段。
- 文件上传：本地 StorageService 已有；对象存储 R2/S3/OSS/COS 仅预留，未接入。
- 测试：完成命令验证和部分接口冒烟测试；没有 Playwright/E2E 自动化套件。

## 未开始

- 忘记密码/重置密码完整邮件流程。
- 用户注销账号。
- 网站设置后台编辑保存。
- 内容列表卡片/列表视图切换、骨架屏、请求失败重试按钮。
- 上传图片删除接口。
- Playwright 自动化测试。

## 存在问题

- 当前 Windows 本机执行 `npm run admin:reset` 会因 `tsx`/esbuild `spawn EPERM` 失败；Docker 容器内执行成功。当前管理员重置统一通过 `docker compose exec -T app npm run admin:reset` 执行。
- 本轮早期创建的旧脚本 `scripts/reset-admin.ts` 已不再被 `package.json` 引用，但 Windows 拒绝删除该文件；已加入 `.git/info/exclude` 做本地排除，不提交到仓库，后续可在文件锁解除后移除。
- 本地 Windows 运行 `npm run build` 会因为 `.next-final` 文件锁失败：`EPERM: operation not permitted, unlink '.next-final/diagnostics/build-diagnostics.json'`。Docker 内生产构建已通过。
- `middleware.ts` 仍存在，Next 16 提示该约定已弃用，建议后续迁移到 `proxy.ts`；之前删除/改名被 Windows 权限拒绝过。
- 收藏表对内容是 cascade 删除；软删除内容可保留收藏，永久删除会删除收藏。

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

接口冒烟验证：

- `admin@pzq1688.local` 登录成功并可访问 `/admin`。
- 旧 `admin/admin` 登录返回 401。
- 未登录访问 `/admin` 会跳转 `/login`；普通用户访问 `/admin` 会跳转 `/403`；普通用户调用 `/api/admin/contents` 返回 403；管理员调用返回 200。
- Markdown 冒烟测试通过：GFM 表格、任务列表、行内代码、代码块语言、未知语言降级、复制按钮、安全外链、危险链接降级、原始 HTML 过滤、草稿/下架/软删除前台不可访问、管理员预览不增加浏览量。
- 分类移动删除验收通过：有关联内容的分类直接删除会失败；选择目标分类后可移动内容并删除原分类；内容分类已更新。
- 标签合并验收通过：源标签关联迁移到目标标签，重复关联被跳过，源标签被删除。
- 管理员创建内容成功。
- 发布后前台详情页返回 200。
- 下架成功。
- 软删除、恢复、永久删除成功。

## 当前已知错误

- Windows 本机 `npm run build` 因 `.next-final` 文件锁失败；Docker 构建中 `next build` 成功。
- Windows 本机 `npm run admin:reset` 因 `tsx`/esbuild `spawn EPERM` 失败；Docker 容器内执行成功。

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
