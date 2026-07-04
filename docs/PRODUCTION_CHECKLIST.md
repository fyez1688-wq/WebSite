# Production Launch Checklist

目标域名：`https://pzq1688.com/`

本清单用于上线前门禁和风险排查。不要在上线流程中执行 `prisma migrate reset`、`docker volume prune`、`docker system prune -a --volumes`，也不要清空数据库或删除上传文件。

## 上线建议

当前不建议在未完成下列“必须完成项”前直接上线。代码侧 P2 验收已经完成，但生产上线还需要人工确认域名、生产密钥、备份、Docker 构建网络和首次部署结果。

可以进入上线窗口的前提：

- 生产 `.env` 已配置真实强密钥和强密码。
- 域名 `pzq1688.com` 的 A/AAAA 记录已指向当前服务器公网 IP。
- 服务器 80/443 可公网访问，未被安全组、防火墙或其他服务占用。
- 已完成数据库备份，并在非生产环境演练过恢复。
- `docker compose up -d --build` 在服务器上成功完成。
- smoke test 和 Playwright E2E 在部署目标或等价环境通过。

## 必须完成项

### 生产环境变量

生产 `.env` 至少需要确认：

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://pzq1688.com
NEXTAUTH_URL=https://pzq1688.com
NEXTAUTH_SECRET=<至少 32 字符的随机密钥>
POSTGRES_PASSWORD=<强随机数据库密码>
ADMIN_EMAIL=<真实管理员邮箱>
ADMIN_PASSWORD=<至少 16 位且包含大小写字母、数字、符号的强密码>
ADMIN_NAME=<管理员显示名>
MAX_UPLOAD_MB=5
MAX_UPLOAD_WIDTH=4096
MAX_UPLOAD_HEIGHT=4096
```

检查要求：

- 不允许使用 `admin / admin`。
- `ADMIN_PASSWORD` 不得使用 `.env.example` 中的占位值。
- `NEXTAUTH_SECRET` 必须是足够随机的生产密钥，不得使用 `build-time-secret` 或示例值。
- Docker Compose 中 `DATABASE_URL` 会指向 `db:5432/fy_site`，密码来自 `POSTGRES_PASSWORD`；确认该值只连接当前生产数据库。
- `.env` 不得提交 Git，不得写入 README、issue、聊天记录或镜像公开层。

### 管理员账号

- 首次部署会执行 `npm run seed`，seed 会读取 `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME`。
- 如果数据库中已有旧管理员，单纯修改 `.env` 不会自动覆盖旧密码；需要在确认生产 `.env` 后执行受控重置：

```bash
docker compose exec -T app npm run admin:reset
```

- 重置后登录 `/login`，确认旧 `admin/admin` 不能登录，生产管理员可以进入 `/admin`。

### Docker volume 保护

以下 volume 是持久化数据，不等于缓存，禁止自动清理：

- `postgres-data`：PostgreSQL 数据。
- `uploaded-files`：用户上传文件，挂载到 `/app/public/uploads`。
- `caddy-data`：Caddy HTTPS 证书、账户和 ACME 数据。
- `caddy-config`：Caddy 运行配置数据。

清理任何 volume 前必须同时满足：

- 已确认 volume 名称。
- 已确认用途，不属于数据库、Caddy 证书或上传文件。
- 已完成数据库备份。
- 已完成上传文件备份。
- 用户明确同意。

禁止上线或维护时执行：

```bash
docker volume prune
docker system prune -a --volumes
```

### 上传文件持久化

`docker-compose.yml` 已挂载：

```yaml
uploaded-files:/app/public/uploads
```

上线前确认：

- `uploaded-files` volume 存在或将由 Compose 创建。
- app 容器内 `/app/public/uploads` 可写。
- 备份策略覆盖上传文件，不只备份数据库。

### Caddy HTTPS 和反向代理

`docker/Caddyfile` 当前配置：

```caddy
pzq1688.com {
  encode zstd gzip
  reverse_proxy app:3000
}
```

上线前确认：

- DNS 已指向当前服务器。
- 服务器 80/443 对公网开放。
- 没有其他进程占用 80/443。
- `caddy-data` 和 `caddy-config` volume 不被删除，否则可能丢失证书和 ACME 状态。
- `NEXTAUTH_URL` 和 `NEXT_PUBLIC_SITE_URL` 都是 `https://pzq1688.com`，避免 Cookie、回调和 SEO URL 不一致。

### 数据库迁移

当前安全迁移命令：

```bash
npx prisma migrate deploy
```

Docker app 启动命令会自动执行：

```bash
npx prisma migrate deploy && npm run seed && node server.js
```

上线前确认：

- 迁移文件已提交。
- 生产数据库已备份。
- 不运行 `prisma migrate reset`。
- 不使用 `prisma migrate dev` 连接生产库。

### 备份和恢复

上线前至少执行一次备份：

```powershell
./scripts/backup-db.ps1
```

Linux 等价命令：

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U fy_user fy_site > backups/fy_site.sql
```

恢复命令只能在确认目标库后执行：

```powershell
./scripts/restore-db.ps1 -File backups/fy_site-YYYYMMDD-HHMMSS.sql
```

上线前必须在非生产环境演练恢复。生产恢复前要确认目标数据库、备份文件时间点和影响范围。

### 部署命令

推荐上线流程：

```bash
git status --short
git log --oneline -5
npm run lint
npx tsc --noEmit
npm run test:permissions
npm run test:markdown
npm run test:category-delete
npm run test:upload
npm run test:e2e
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 caddy
```

部署后检查：

```bash
curl -I https://pzq1688.com/
curl -I https://pzq1688.com/login
curl -I https://pzq1688.com/robots.txt
curl -I https://pzq1688.com/sitemap.xml
```

如果 Docker Hub 或 npm 网络出现 EOF/ECONNRESET，需要记录为外部网络问题，恢复网络后重试；不要用旧镜像成功运行掩盖新版本构建失败。

### 验收测试

上线前推荐运行：

```bash
npm run lint
npx tsc --noEmit
npm run test:permissions
npm run test:markdown
npm run test:category-delete
npm run test:upload
npm run test:e2e
```

如果 E2E 指向生产域名，需要显式配置：

```env
PLAYWRIGHT_BASE_URL=https://pzq1688.com
PLAYWRIGHT_SKIP_WEBSERVER=1
E2E_ADMIN_EMAIL=<生产管理员邮箱>
E2E_ADMIN_PASSWORD=<生产管理员密码>
```

注意：E2E 会创建 `E2E_TEST_` 前缀数据并清理自身数据。不要在未确认清理策略前把生产数据当作测试数据。

### 日志和健康检查

当前健康检查：

- `db` 通过 `pg_isready -U fy_user -d fy_site` 检查。
- `app` 依赖 db healthy 后启动。
- 尚未配置独立 app HTTP healthcheck，生产可先用首页、`/login`、`/robots.txt`、`/sitemap.xml` 和后台登录作为启动检查。

日志查看：

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 db
docker compose logs --tail=200 caddy
docker compose logs -f app
```

## 回滚方案

推荐回滚方式：

1. 保留上线前 Git 提交号和镜像构建日志。
2. 上线前完成数据库备份和上传文件备份。
3. 如果新版本启动失败且未产生不兼容数据写入，回到上一个提交：

```bash
git checkout <previous-good-commit>
docker compose up -d --build app
docker compose logs --tail=100 app
```

4. 如果已经执行了数据库迁移，不要直接手工删表或改表；先评估迁移是否向后兼容，必要时用备份在非生产环境演练恢复。
5. 如果需要恢复数据库，先停写入流量，再确认备份文件和目标库，最后执行恢复。

## 可以上线后继续完善

- 对象存储 Provider：Cloudflare R2 / S3 兼容存储仍未接入，当前上传保存在 `uploaded-files` volume。
- 更完整 Playwright 覆盖：批量操作、用户收藏、搜索筛选、回收站永久删除和跨浏览器矩阵。
- CI 自动化测试和部署流水线。
- 独立 app HTTP healthcheck。
- 更完整的数据库备份、上传文件备份和恢复演练自动化。
- sitemap / robots / SEO 深度验收：已有 sitemap、robots 和 metadata 基础能力，但内容 SEO 字段前台使用仍需进一步验收。
- 生产监控、告警和日志保留策略。

## 当前主要风险

- Docker build 依赖 Docker Hub 和 npm 网络，历史上出现过 EOF / ECONNRESET。
- Windows 普通受限 shell 历史上出现过 `spawn EPERM`，生产部署建议在 Linux 服务器或完整权限 shell 执行。
- Caddy 自动签发证书依赖 DNS 正确解析和 80/443 可访问。
- 本地上传依赖 Docker volume，若未备份 `uploaded-files`，服务器故障会导致上传图片丢失。
- 对象存储未接入，跨服务器迁移上传文件需要额外处理。
- `structured-text` 当前按纯文本显示，不影响上线安全，但不是完整结构化文本渲染。
