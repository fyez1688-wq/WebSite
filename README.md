# FY的小站

资源收藏、学习资料、技术文章、软件下载于一体的 Next.js 网站。

完整项目说明文档：`docs/PROJECT_FULL_EXPLANATION.md`

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
npm run test:music
npm run test:e2e
npm run prisma:migrate
npm run seed
```

## 图片存储 Provider

图片上传默认继续使用本地存储，不配置对象存储也能正常开发：

```env
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=public/uploads
LOCAL_UPLOAD_PUBLIC_BASE_URL=/uploads
```

本地模式将封面保存到 `public/uploads/covers`。Docker 中该目录由 `uploaded-files` volume 持久化。切换到 Cloudflare R2 或其他 S3 兼容存储时配置：

```env
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=replace-with-bucket-name
S3_ACCESS_KEY_ID=replace-in-private-env
S3_SECRET_ACCESS_KEY=replace-in-private-env
S3_PUBLIC_BASE_URL=https://cdn.example.com/uploads
S3_FORCE_PATH_STYLE=true
```

也可使用 `STORAGE_PROVIDER=s3`。标准 AWS S3 可以将 `S3_ENDPOINT` 留空，R2 或其他兼容服务必须填写 endpoint。`S3_PUBLIC_BASE_URL` 必须是该 bucket 中文件的公开访问基址；上传接口用它生成 URL。对象存储配置缺失或 URL 非法时，上传会返回明确错误，本地默认模式不受影响。

真实 access key 和 secret 只能放在未提交的 `.env` 或部署平台安全变量中。服务端只生成和删除 `covers/<UUID>.(jpg|png|webp)` key，不能通过接口删除任意 bucket 对象。所有 Provider 在保存前共用 MIME、文件签名、大小和宽高校验。

切换到对象存储后，新文件不写入 `uploaded-files` volume；既有本地文件不会自动迁移，迁移前必须先备份并制定 URL 兼容方案。基础测试使用 fake S3 client，不需要真实 R2 凭据：`npm run test:upload`。

## 听歌模块

站点包含一个轻量的背景音乐功能，定位为学习、阅读、写代码时使用，不是大型音乐平台。

- 前台入口：顶部右侧圆形音乐图标、`/music` 音乐小角落、全站右下角迷你播放器。
- 后台入口：`/admin/music`，管理员可新增、编辑、软删除、启用/禁用、设置首页推荐和排序。
- 音频可填写合法外链 URL，也可由管理员上传 MP3、M4A、OGG、WAV、FLAC 到当前 StorageProvider；封面图可填写 URL 或复用现有图片上传接口。
- 音频 URL 必须是公开可访问的 `http/https` 地址，服务端会拒绝危险协议和本机/私网地址。
- 删除后台歌曲时，仅当 `audioUrl` 能匹配当前 StorageProvider 的受控 `audio/<UUID>.<ext>` 公开地址才会同步清理对象；外部链接、`covers/` 路径和仍被其他未删除歌曲引用的音频均不会被删除。
- 网站不应托管或引用未经授权的商业音乐；音频链接和文件需要管理员自行确认版权。
- 不提供盗版下载功能，不默认自动播放，用户必须主动点击播放。
- 基础验收命令：`npm run test:music`。

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

上线前先按 [生产部署检查清单](docs/PRODUCTION_CHECKLIST.md) 完成环境变量、备份、Docker volume、Caddy HTTPS、测试和回滚检查。

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

如果 Docker 构建阶段访问 npm 官方源不稳定，可临时在未提交的 `.env` 中设置镜像源：

```env
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
```

不设置时默认使用 `https://registry.npmjs.org/`。Dockerfile 会为 `npm ci` 配置 5 次重试、20 至 120 秒退避和 120 秒单次下载超时，并使用 BuildKit cache mount 保留已下载的 npm 包；镜像源通过 Compose build arg 传入，不会写死为唯一选择。

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

## Playwright E2E 测试

端到端测试位于 `tests/e2e/`，默认访问 `http://localhost:3000`，可通过 `PLAYWRIGHT_BASE_URL` 覆盖。测试会使用 `E2E_TEST_` 前缀创建临时分类、内容和用户，并在测试结束后通过受控后台 API 清理自己创建的数据。

需要的环境变量：

```env
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=replace-with-a-strong-admin-password
E2E_USER_EMAIL=
E2E_USER_PASSWORD=
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_SKIP_WEBSERVER=1
```

如果未设置 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`，测试会读取 `.env` 中的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`。不要使用 `admin/admin`。

首次运行如缺少浏览器，请安装：

```bash
npx playwright install chromium
```

运行：

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

当前 E2E 覆盖后台权限、管理员访问、普通用户拒绝访问、内容草稿/发布/下架/回收站、Markdown 前台渲染、上传权限和分类移动后删除。失败截图、trace 和报告输出到 `test-results/`、`playwright-report/`，这些目录已被 `.gitignore` 忽略。

测试不会执行 `prisma migrate reset`，不会清空数据库，不会清理 Docker volume，不会删除非 `E2E_TEST_` 数据。

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

## 当前生产访问状态

- 正式公网入口：`https://pzq1688.com`，通过 Cloudflare Tunnel `fy-site-tunnel` 访问本机 `HTTP localhost:3000` 服务。
- 生产环境的 `NEXTAUTH_URL` 与 `NEXT_PUBLIC_SITE_URL` 使用 `https://pzq1688.com`。
- 生产图片上传使用 `STORAGE_PROVIDER=r2` 和 Cloudflare R2；本地开发可使用 `STORAGE_PROVIDER=local`。
- R2 公共图片通过 `PublicImage` 直连，不经过 Next 图片优化器；本地 `/uploads` 和站内静态图片仍可使用优化。

推荐维护流程：

```bash
git pull
npm run lint
npx tsc --noEmit
# 运行与改动相关的 smoke test，例如 npm run test:upload
git commit -m "说明"
git push origin main
```

持续运维应包含 Playwright E2E、自动备份与恢复演练、生产日志和健康检查、Cloudflare Tunnel 状态监控、R2 对象备份或生命周期策略，以及管理员真实登录回调复核。
