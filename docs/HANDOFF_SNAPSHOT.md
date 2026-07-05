# Handoff Snapshot

## Project

- 项目名称：FY的小站
- 正式域名：https://pzq1688.com/
- 创建时间：2026-07-05
- 创建快照时 Git HEAD：`b51c6866d864c57c0f4d39136e9d25e0a486ccac`

## 当前已完成主要功能

- Next.js App Router + TypeScript + Tailwind CSS 基础项目。
- PostgreSQL + Prisma 7 数据模型、正式迁移和 Docker Compose 部署路径。
- NextAuth Credentials 登录、注册、会话、管理员权限校验。
- 前台首页、内容列表、详情、搜索、收藏、用户中心和基础静态页面。
- 后台控制台、内容管理、分类管理、标签管理、用户管理、轮播图、公告、设置展示和操作日志。
- Markdown 编辑、预览、前台渲染、代码块复制和基础安全过滤。
- 图片上传安全校验、本地上传存储和上传文件 Docker volume 持久化。
- 分类移动后删除、标签合并、内容软删除和回收站。
- 轻量听歌模块第一版，包括 `/music`、顶部音乐入口、迷你播放器和后台音乐管理。
- 生产部署检查清单、Docker 安全清理文档和基础 E2E/smoke 测试。

## 当前测试命令

```powershell
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test:permissions
npm run test:markdown
npm run test:category-delete
npm run test:tag-merge
npm run test:upload
npm run test:music
npm run test:e2e
npm run build
```

Docker/部署相关：

```powershell
docker compose up -d --build
docker compose exec -T app npx prisma migrate deploy
npm run docker:df
```

## 当前本地备份目录

```text
D:\fy-site-backup\fy-site-20260705-123524
```

该目录在本机 D 盘。重装系统前必须手动复制到 U 盘、移动硬盘、网盘或另一台电脑，否则重装可能导致 `.env`、数据库 dump 和上传文件备份丢失。

备份内容包括：

- `.env`
- PostgreSQL dump：`database\fy_site.dump`
- 上传文件：`uploaded-files\uploads`
- `RESTORE_STEPS.md`
- `GIT_HEAD.txt`
- `GIT_STATUS_SHORT.txt`

## 重装后恢复要点

1. 从 GitHub clone 项目仓库。
2. 根据 `GIT_HEAD.txt` 确认需要恢复到的提交。
3. 将备份目录中的 `.env` 恢复到项目根目录。
4. 启动 Docker PostgreSQL，并用 `database\fy_site.dump` 恢复数据库。
5. 启动 app 服务，并恢复 `uploaded-files\uploads` 到 `/app/public/uploads`。
6. 执行依赖安装和校验命令：

```powershell
npm install
npx prisma generate
npm run lint
npm run build
```

完整恢复步骤见备份目录中的：

```text
D:\fy-site-backup\fy-site-20260705-123524\RESTORE_STEPS.md
```

## 禁止事项

- 不提交 `.env`。
- 不提交数据库备份。
- 不提交上传文件。
- 不运行 `prisma migrate reset`。
- 不运行 `docker volume prune`。
- 不运行 `docker system prune -a --volumes`。
