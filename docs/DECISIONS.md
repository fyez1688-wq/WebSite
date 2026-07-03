# Decisions

## 继续使用 Next.js App Router

- 原因：当前项目已基于 App Router 构建，页面、API、metadata、sitemap 都使用该模式。
- 影响范围：`app/` 下所有页面和 Route Handler。
- 修改前检查：Next 版本兼容性、现有路由、部署方式、Docker standalone 输出。

## 继续使用 PostgreSQL 和 Prisma

- 原因：数据库模型、迁移、服务层、Docker db 都已围绕 PostgreSQL + Prisma 7 实现。
- 影响范围：`prisma/`、`lib/prisma.ts`、所有服务层和 API。
- 修改前检查：迁移兼容性、Prisma adapter、生产数据备份。

## 正文继续以 Markdown 格式存储

- 原因：当前 `Content.content` 是纯文本字段，后台编辑器按 Markdown 输入，迁移成本低。
- 影响范围：内容编辑器、详情页、预览页、搜索摘要。
- 修改前检查：是否需要富文本 JSON、HTML 清洗、历史内容转换方案。

## 内容使用软删除

- 原因：后台需要回收站，软删除可以保留历史数据、收藏关系和操作日志。
- 影响范围：`Content.deletedAt`、`deletedById`、前台查询过滤、后台回收站。
- 修改前检查：前台所有查询是否过滤 `deletedAt = null`，永久删除时关联数据是否正确处理。

## 软件和下载详情使用 ContentResourceDetail 扩展表

- 原因：避免 `Content` 表继续膨胀，软件/下载字段只在特定内容类型需要。
- 影响范围：内容编辑页、内容服务、Prisma schema、资源展示。
- 修改前检查：是否有更多资源类型扩展字段，是否需要一对多下载镜像。

## 管理员权限必须由服务端会话判断

- 原因：前端隐藏按钮不能作为安全边界，管理员身份不能信任客户端传参。
- 影响范围：所有 `/admin` 页面、`/api/admin/*` 接口、服务端写操作。
- 修改前检查：是否调用 `requireAdmin()` 或 `requireAdminApi()`，是否存在绕过入口。

## 数据库变更必须使用正式迁移

- 原因：保护已有数据，支持 Docker 和生产环境可重复部署。
- 影响范围：`prisma/schema.prisma`、`prisma/migrations`、部署脚本。
- 修改前检查：迁移是否只做兼容变更，是否有备份，是否会删除或清空数据。

## 不重新开发第二套认证系统

- 原因：NextAuth 已接入登录、会话、权限和 Cookie 策略，重复认证会增加安全风险。
- 影响范围：登录页、API 鉴权、后台权限、用户中心。
- 修改前检查：现有会话字段、Cookie secure 策略、角色状态判断。

## 前台和后台复用现有内容模型

- 原因：避免前后台数据割裂，发布后的内容应立即被首页、列表、搜索、详情读取。
- 影响范围：`Content`、`Category`、`Tag`、前台查询、后台内容服务。
- 修改前检查：前台过滤规则、SEO 字段、发布状态和软删除状态。

## Docker Compose 是当前主要部署路径

- 原因：项目已经有 `db`、`app`、`caddy` 三服务，Docker 内生产构建已通过。
- 影响范围：`Dockerfile`、`docker-compose.yml`、`docker/Caddyfile`、README。
- 修改前检查：PostgreSQL 数据卷、环境变量、Caddy 域名、HTTPS、迁移启动命令。

