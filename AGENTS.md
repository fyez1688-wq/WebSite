# FY的小站 Agent Rules

项目名称：FY的小站  
正式域名：https://pzq1688.com/

## 技术栈

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM 7
- NextAuth Credentials
- Zod 服务端验证
- Docker Compose + Caddy

## 运行方式

- 本地开发：`npm install`、`npx prisma generate`、`npm run dev`
- Docker：`docker compose up -d --build`
- 常用检查：`npx prisma generate`、`npx prisma migrate deploy`、`npm run lint`、`npm run build`

## 长期规则

- 开始任何任务前必须先读取：
  - `docs/PROJECT_STATUS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/NEXT_TASK.md`
  - `docs/DECISIONS.md`
- 完成任务后必须更新：
  - `docs/PROJECT_STATUS.md`
  - `docs/NEXT_TASK.md`
- 数据库变更必须通过正式 Prisma migration，不得直接改生产库结构。
- 不得清空生产数据库，不得运行 `prisma migrate reset`。
- 不得使用静态假数据代替数据库功能。
- 不得推翻已有登录、首页、收藏和用户系统；除非为兼容明确需求，只做局部扩展。
- 不得使用 `admin / admin` 作为长期或生产管理员账号密码。
- 所有后台写操作必须进行服务端管理员验证，不能信任前端传入的 `userId`、`role`、`isAdmin`、`email`。
- 管理员权限必须从安全服务端会话获取，优先复用 `requireAdmin()` / `requireAdminApi()`。
- 提交或部署前检查 `.env`、密码、Token、数据库数据、上传私密文件没有进入版本控制。
- 每次大量 Docker 构建、测试或部署后，应先检查 Docker 空间占用，推荐先执行 `docker system df` 和 `docker system df -v`，再决定清理方式。
- 可以安全清理 Docker build cache、dangling images、已停止且确认不再需要的临时容器。
- 禁止未经确认自动清理 Docker volume；不得新增或执行 `docker volume prune`、`docker system prune -a --volumes` 等会删除 volume 的危险命令。
- 特别保护 PostgreSQL 数据 volume、Caddy 数据和证书 volume、`uploaded-files` 上传文件 volume。
- 清理 Docker volume 前必须确认 volume 名称、volume 用途、是否已有数据库备份、是否已有上传文件备份，并取得用户明确同意。
- 不允许为了释放空间误删数据库、HTTPS 证书、上传文件或生产数据。
