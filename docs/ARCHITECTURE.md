# Architecture

## 主要目录

- `app/`：Next.js App Router 页面和 Route Handlers。
- `components/`：前台和后台 React 组件。
- `lib/`：认证、权限、Prisma 客户端、响应格式、安全工具、验证规则。
- `services/`：内容、上传、操作日志等服务层。
- `prisma/`：Prisma schema、迁移、seed。
- `docker/`：Caddy 配置。
- `scripts/`：数据库备份/恢复脚本。
- `docs/`：项目交接和维护文档。

## 身份认证流程

登录使用 NextAuth Credentials Provider。登录表单提交账号或邮箱与密码，`lib/auth.ts` 使用 `loginSchema` 校验输入，通过 Prisma 查询用户，再用 bcrypt 校验 `passwordHash`。JWT 会话中保存 `id`、`role`、`status`。

本地 HTTP 登录时 Cookie secure 由 `NEXTAUTH_URL` 是否为 `https://` 决定；生产域名 HTTPS 下使用 Secure Cookie。

## 管理员权限验证流程

- 页面：调用 `requireAdmin()`，未登录跳登录，非管理员跳 `/403`。
- API：调用 `requireAdminApi()`，非管理员返回 403。
- 后台写接口还会调用 `assertSameOrigin()` 做基础 CSRF 防护。
- 业务代码不得信任前端传入的 `userId`、`role`、`email`、`isAdmin`。

## 内容流程

内容服务集中在 `services/content.ts`：

- `createContent()`：创建草稿或发布内容，写入标签和资源扩展。
- `updateContent()`：编辑内容，支持发布、下架、草稿保存和 `updatedAt` 乐观锁。
- `softDeleteContent()`：软删除，设置 `deletedAt`、`deletedById`。
- `batchOperateContent()`：批量发布、下架、删除、推荐、置顶、移动分类。
- `listAdminContents()`：后台分页查询，只取列表需要字段。

内容发布时验证标题、正文、slug 唯一、分类存在且启用、标签存在。前台只读取 `status = PUBLISHED`、`deletedAt = null`、`isHidden = false` 的内容。

## 收藏流程

游客收藏保存在 localStorage。登录后 `components/favorite-sync.tsx` 调用 `/api/favorites` 将本地收藏合并到数据库。登录用户收藏通过 `services/favorites.ts` 中的事务写入，`Favorite` 有 `userId + contentId` 唯一约束，防止重复收藏。

## 听歌模块流程

听歌模块定位为学习、阅读、编程时的背景音乐播放器，不作为大型音乐平台使用。

- 数据模型：`MusicTrack` 保存歌曲标题、作者、封面、音频 URL、来源、授权、分类、排序、发布状态、首页推荐、播放量和软删除时间。
- 前台页面：`/music` 展示已发布且未软删除的音乐，支持搜索歌曲名、作者、专辑和按分类筛选。
- 顶部入口：`components/header.tsx` 在右侧按钮区显示圆形音乐图标，点击只展开迷你播放器，不自动播放。
- 全站播放器：`components/music/music-player.tsx` 使用浏览器原生 `Audio`，`components/music/mini-player.tsx` 默认收起，用户主动点击后播放，页面内切换尽量保持播放状态。
- 后台页面：`/admin/music` 通过管理员 layout 的 `requireAdmin()` 保护，表单提交到 `/api/admin/music`。
- 后台 API：所有写操作调用 `requireAdminApi()` 和 `assertSameOrigin()`，不信任前端传入身份。
- 音频来源：支持填写合法可外链音频 URL，或由管理员上传 MP3、M4A、OGG、WAV；音频上传复用 StorageProvider，并以受控 `audio/<uuid>.<ext>` key 保存。封面继续复用图片上传接口。
- URL 安全：`musicTrackSchema` 限制音频 URL 为公开 `http/https`，拒绝危险协议、本机和私网地址。
- 播放量：`POST /api/music/[id]/play` 只对已发布、未删除音乐计数，并做 30 秒基础防刷。

## 图片上传流程

后台上传接口为 `/api/admin/uploads`。接口验证管理员权限和同源请求，调用 `services/storage.ts`：

- 限制 JPG/JPEG/PNG/WEBP。
- 限制大小，默认 `MAX_UPLOAD_MB=5`。
- 检查 MIME 和文件签名。
- 使用随机 UUID 文件名。
- 在进入 Provider 前解析图片宽高，避免对象存储绕过安全校验。

`STORAGE_PROVIDER=local` 默认选择 `LocalStorageProvider`，保存到 `LOCAL_UPLOAD_DIR/covers`，返回 `LOCAL_UPLOAD_PUBLIC_BASE_URL/covers/...`。`STORAGE_PROVIDER=s3` 或 `r2` 选择 `S3CompatibleStorageProvider`，通过 AWS SDK v3 写入 S3 兼容 bucket，并用 `S3_PUBLIC_BASE_URL` 生成公开 URL。

Provider 统一返回 `url`、`key`、`provider`。对象 key 固定为服务端生成的 `covers/<UUID>.(jpg|png|webp)`；删除时再次验证 key 或从受控公开 URL 解析 key，不能删除任意本地路径或 bucket 对象。S3/R2 配置缺失时 Provider 构造会给出缺失字段错误，不影响默认 local 启动。

## Markdown 存储与渲染

正文以 Markdown 文本存入 `Content.content`。后台编辑器是 textarea + Markdown 工具栏，支持编辑、分屏和预览模式。前台详情页、后台编辑器预览和管理员独立预览页复用 `components/markdown-preview.tsx`，通过 `react-markdown` + `remark-gfm` 渲染 GitHub 风格 Markdown，并用 Prism Light 做常用语言代码高亮。

Markdown 渲染组件禁用原始 HTML，过滤危险链接和图片地址，外部链接增加 `noopener noreferrer`，代码块复制按钮只在客户端处理文本复制，不执行代码。

## 分类与标签流程

分类和标签页面复用 `components/admin-taxonomy-client.tsx`。分类删除时，如果仍有关联内容，服务端会要求选择目标分类，并在事务内移动内容后删除原分类。标签合并通过 `POST /api/admin/tags/[id]/merge` 完成，事务内把源标签关联迁移到目标标签，跳过已有重复关联，删除源标签并写入操作日志。

## Prisma 与 PostgreSQL

Prisma 7 使用 `@prisma/adapter-pg`。数据库连接在 `prisma.config.ts` 和 `lib/prisma.ts` 中配置，运行时通过 `DATABASE_URL` 注入。Schema 中不写 datasource URL，这是 Prisma 7 规则。

迁移文件在 `prisma/migrations`，Docker app 启动时执行：

```bash
npx prisma migrate deploy && npm run seed && node server.js
```

## Docker 与 Caddy

`docker-compose.yml` 包含：

- `db`：PostgreSQL 18，volume 挂载到容器 `/var/lib/postgresql`，保存数据库数据。
- `app`：Next.js standalone 镜像，依赖 db healthy；local 模式的上传文件 volume 挂载到 `/app/public/uploads`。S3/R2 模式的新文件保存在外部 bucket，volume 只保留既有本地文件。
- `caddy`：反向代理，绑定 80/443，读取 `docker/Caddyfile`；Caddy data/config volume 保存证书、账户和运行配置。

本地访问主要使用 `http://localhost:3000`。正式域名使用 Caddy 代理到 app。

持久化 volume：

- `postgres-data`：PostgreSQL 数据，不能随意清理。
- `uploaded-files`：用户上传文件，不能随意清理。
- `caddy-data`：Caddy 证书和账户数据，不能随意清理。
- `caddy-config`：Caddy 运行配置数据，不能随意清理。

volume 是持久化数据，不等于临时缓存。Docker 空间维护应先用 `docker system df`、`docker system df -v` 查看占用。默认只清理构建缓存、dangling images、已停止且确认不再需要的临时容器；不得自动清理 volume。清理任何 volume 前必须确认名称、用途、备份和用户授权。

## 关键文件

- `lib/auth.ts`：NextAuth 配置。
- `lib/permissions.ts`：用户和管理员权限验证。
- `lib/validators.ts`：Zod 输入校验。
- `lib/prisma.ts`：Prisma Client 单例。
- `services/content.ts`：内容管理服务。
- `services/storage.ts`：上传存储服务。
- `services/operation-log.ts`：操作日志服务。
- `app/admin/content/page.tsx`：后台内容列表。
- `components/admin-content-list.tsx`：后台内容表格、筛选、批量操作。
- `components/admin-content-form.tsx`：创建/编辑内容表单。
- `app/api/admin/contents/*`：后台内容管理 API。
- `app/music/page.tsx`：公开音乐列表页。
- `app/admin/music/page.tsx`：后台音乐管理页。
- `components/music/*`：音乐卡片、共享播放器和迷你播放器。
- `components/admin-music-client.tsx`：后台音乐管理客户端组件。
- `services/music.ts`：音乐查询、创建、更新、软删除和播放量计数服务。
- `app/api/music/*`：公开音乐 API。
- `app/api/admin/music/*`：后台音乐管理 API。
- `app/api/admin/tags/[id]/merge/route.ts`：标签合并 API。
- `components/markdown-preview.tsx`：统一 Markdown 渲染和代码复制组件。
- `prisma/schema.prisma`：数据库模型。
- `prisma/seed.ts`：初始化管理员和基础数据。
