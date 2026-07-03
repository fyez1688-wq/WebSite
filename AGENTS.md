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

