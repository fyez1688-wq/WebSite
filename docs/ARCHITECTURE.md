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

## 图片上传流程

后台上传接口为 `/api/admin/uploads`。接口验证管理员权限和同源请求，调用 `services/storage.ts`：

- 限制 JPG/JPEG/PNG/WEBP。
- 限制大小，默认 `MAX_UPLOAD_MB=5`。
- 检查 MIME 和文件签名。
- 使用随机 UUID 文件名。
- 保存到 `public/uploads/covers`，返回 `/uploads/covers/...` URL。

对象存储尚未接入，但页面只依赖统一上传接口。

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

- `db`：PostgreSQL 18，volume 挂载 `/var/lib/postgresql`。
- `app`：Next.js standalone 镜像，依赖 db healthy。
- `caddy`：反向代理，绑定 80/443，读取 `docker/Caddyfile`。

本地访问主要使用 `http://localhost:3000`。正式域名使用 Caddy 代理到 app。

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
- `app/api/admin/tags/[id]/merge/route.ts`：标签合并 API。
- `components/markdown-preview.tsx`：统一 Markdown 渲染和代码复制组件。
- `prisma/schema.prisma`：数据库模型。
- `prisma/seed.ts`：初始化管理员和基础数据。
