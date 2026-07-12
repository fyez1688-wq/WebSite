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

## Docker 清理策略：默认只自动清理构建缓存、dangling images 和已停止临时容器，不自动清理 volume

- 原因：volume 可能保存 PostgreSQL 数据、Caddy HTTPS 证书和用户上传文件，误删会造成数据丢失或网站不可用。
- 影响范围：Docker 运维、空间清理、数据库安全、上传文件保存、HTTPS 证书保存。
- 默认策略：只自动或半自动清理构建缓存、dangling images、已停止且确认不再需要的临时容器。
- 禁止事项：不得未经确认执行 `docker volume prune`；不得未经确认删除 PostgreSQL、Caddy 或用户上传文件 volume。
- 修改前检查：清理 volume 前必须确认 volume 名称、用途、是否已有备份，并取得用户明确同意。

## 听歌模块第一版只支持合法音频 URL

- 原因：听歌模块只是学习、阅读、编程时的背景音乐功能，不应扩展成大型音乐平台，也不应引入音频上传持久化、转码或版权风险。
- 影响范围：`MusicTrack.audioUrl`、`/music`、首页音乐卡片、全站迷你播放器、`/admin/music`。
- 第一版策略：管理员手动录入自己有权使用、公开授权或允许外链播放的音频 URL；封面图可复用现有图片上传；不支持音频文件上传。
- 安全约束：音频 URL 必须是公开 `http/https`，拒绝 `javascript:`、`data:`、localhost 和私网地址；前台只展示 `isPublished = true` 且 `deletedAt = null` 的音乐。
- 合规约束：后台和 README 明确提示不要上传或引用未经授权的商业音乐，不提供盗版下载功能，不默认自动播放。

## 图片存储默认 local，可选 S3/R2 Provider

- 原因：保留当前本地开发和 Docker volume 行为，同时允许生产环境使用 Cloudflare R2 或 S3 兼容对象存储扩展容量和独立持久化。
- Provider 选择：`STORAGE_PROVIDER=local` 为默认值；`s3` 和 `r2` 共用 AWS SDK v3 与 `S3_*` 配置，避免维护两套兼容协议代码。
- 安全边界：文件在 Provider 保存前统一完成大小、MIME、签名和宽高校验；key 由服务端 UUID 生成，删除只接受 `covers/<UUID>.(jpg|png|webp)`。
- 配置策略：真实 access key、secret、bucket 私密信息只通过未提交的 `.env` 或部署安全变量注入；配置缺失时返回清晰错误，禁止静默回退到 local，避免文件落错位置。
- 数据策略：切换 Provider 不自动迁移既有本地文件；迁移前必须备份 `uploaded-files` 并规划旧 URL，不能因启用对象存储删除 volume。
