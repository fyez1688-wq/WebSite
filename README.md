# FY的小站

资源收藏、学习资料、技术文章、软件下载于一体的 Next.js 网站。

## 架构

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- NextAuth Credentials 登录，密码使用 bcrypt 哈希
- Zod 服务端校验，管理员接口服务端鉴权
- Docker Compose 启动 PostgreSQL、应用和 Caddy HTTPS 反向代理

## 本地运行

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:dev
npm run seed
npm run dev
```

首次管理员账号来自 `.env`：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
ADMIN_NAME=FY Admin
```

初始化脚本如果发现管理员已存在，会跳过创建，不会重复写入。

不得使用 `admin/admin` 作为管理员账号密码。正式上线前请改掉 `.env` 中的 `NEXTAUTH_SECRET`、`ADMIN_EMAIL` 和 `ADMIN_PASSWORD`，密码至少 16 位，并使用大小写字母、数字和符号组合。

如果数据库里已经创建过旧管理员，单纯修改 `.env` 不会自动覆盖旧密码。请在确认 `.env` 已配置强密码后执行：

```bash
npm run admin:reset
```

该命令会按 `.env` 创建或更新管理员，并禁用旧的 `admin` 账号。

## 常用命令

```bash
npm run clean
npm run lint
npm run build
npm run prisma:migrate
npm run seed
```

## Windows 本机构建清理

项目在 `next.config.ts` 中通过 `NEXT_DIST_DIR` 设置 Next.js `distDir`。Docker 构建显式使用 `.next-final/`，Windows 本机默认使用 `.next-local-build/`，避免反复触碰历史锁定的 `.next-final/`。如果 Windows 上出现类似错误：

```text
EPERM: operation not permitted, unlink '.next-final/diagnostics/build-diagnostics.json'
```

通常是 `.next-final` 内文件被 Node/Next 进程、终端、编辑器预览、文件管理器或安全软件占用。先执行：

```bash
npm run clean
npm run build
```

`npm run clean` 会清理 `.next`、`.next-build`、`.next-final`、`.next-local-build`、`out` 和 `tsconfig.tsbuildinfo`。它不会清理 `.env`、`public/uploads`、`uploads`、`prisma`、数据库文件、Docker volume 或源代码。

在 Windows 上，如果构建目录无法直接删除，脚本会先尝试把旧目录隔离到 `.cleanup-stale/`，让活动构建路径空出来；关闭占用进程后可以再次执行 `npm run clean` 清理隔离目录。

如果 `npm run clean` 仍提示 Windows 文件锁，请关闭 `npm run dev`、其他 Next/Node 进程、占用项目目录的终端或编辑器预览；必要时重启终端或电脑后再执行。

## 云服务器 Docker Compose 部署

1. 将代码上传到服务器。
2. 域名 `pzq1688.com` 的 A 记录指向服务器公网 IP。
3. 创建生产环境变量：

```bash
cp .env.example .env
```

4. 修改 `.env` 中的 `POSTGRES_PASSWORD`、`NEXTAUTH_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME`。
5. 启动：

```bash
docker compose up -d --build
```

Caddy 会自动申请 HTTPS 证书。数据库数据保存在 Docker volume `postgres-data`。

## Docker 空间维护

大量构建、测试或部署后，先查看 Docker 空间占用：

```bash
docker system df
docker system df -v
```

可以优先清理构建缓存、dangling images 和已停止且确认不再需要的临时容器：

```bash
docker builder prune -f
docker image prune -f
docker container prune -f
```

也可以使用 npm scripts：

```bash
npm run docker:df
npm run docker:df:detail
npm run docker:clean:build-cache
npm run docker:clean:images
npm run docker:clean:containers
```

不要随便执行以下命令：

```bash
docker volume prune
docker system prune -a --volumes
```

原因：Docker volume 可能保存 PostgreSQL 数据、Caddy HTTPS 证书和用户上传文件。当前项目至少包含这些持久化 volume：

- `postgres-data`：数据库数据。
- `uploaded-files`：用户上传图片，挂载到 `/app/public/uploads`。
- `caddy-data`：Caddy 证书和账户数据。
- `caddy-config`：Caddy 运行配置数据。

volume 是持久化数据，不等于临时缓存。清理任何 volume 前，必须确认 volume 名称、用途、是否已有数据库备份、是否已有上传文件备份，并取得用户明确同意。

## 数据备份和恢复

Windows PowerShell：

```powershell
./scripts/backup-db.ps1
./scripts/restore-db.ps1 -File backups/fy_site-20260703-120000.sql
```

Linux 可执行等价命令：

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U fy_user fy_site > backups/fy_site.sql
cat backups/fy_site.sql | docker compose exec -T db psql -U fy_user -d fy_site
```

建议使用系统计划任务或 cron 每天执行备份脚本。

## 托管平台部署

推荐 Vercel + Neon PostgreSQL：

1. 在 Neon 创建 PostgreSQL 数据库，复制连接串。
2. 在 Vercel 导入本仓库。
3. 配置环境变量：`DATABASE_URL`、`NEXTAUTH_URL=https://pzq1688.com`、`NEXT_PUBLIC_SITE_URL=https://pzq1688.com`、`NEXTAUTH_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME`。
4. 构建命令使用 `npm run build`。
5. 首次部署后在 Vercel 项目终端或本地连接生产库执行：

```bash
npm install
npm run prisma:migrate
npm run seed
```

6. 在 Vercel Domains 添加 `pzq1688.com`，按提示配置 DNS，HTTPS 会自动启用。
7. 使用 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 登录 `/login`，再进入 `/admin`。

## 域名绑定

- 云服务器：DNS A 记录 `pzq1688.com -> 服务器 IP`，80/443 端口放行。
- Vercel：在项目 Domains 添加 `pzq1688.com`，按平台显示的 A/CNAME 记录配置。

## 安全说明

- 管理员权限在服务端校验，普通用户访问 `/admin` 或 `/api/admin/*` 会被拒绝。
- 密码只保存 bcrypt 哈希。
- 收藏接口从安全会话读取用户 ID，不信任客户端传入用户 ID。
- 修改、删除、清空等危险操作在界面做二次确认。
