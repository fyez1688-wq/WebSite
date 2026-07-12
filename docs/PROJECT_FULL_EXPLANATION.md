# FY的小站：从需求到上线准备的完整项目说明

> 这份文档是给编程初学者看的项目复盘。它尽量不用“黑话”直接堆概念，而是从“为什么要做、做成了什么、代码放在哪里、以后怎么维护”一步一步讲清楚。
>
> 本文依据当前项目文件、`docs/` 文档、`prisma/schema.prisma`、Docker 配置和 Git 提交记录整理。没有读取或公开 `.env` 的真实值、密码、Token 或数据库连接密码。

## 1. 项目背景

网站名称是 **FY的小站**。项目文档中记录的正式域名是 `https://pzq1688.com/`，当前公网调试时又提到实际站点会使用 `dev.pzq1688.com`。这两个域名相关配置要以上线时的 DNS、Caddy 和 `.env` 为准。

这个网站最初想解决的问题不是“做一个展示页”，而是做一个自己能长期维护的资源站。它的定位包括：

- 资源收藏：把常用网站、工具、下载地址、学习资料整理到一起。
- 学习资料：存放学习路线、教程、笔记、链接。
- 技术文章：写技术总结，支持 Markdown 和代码块。
- 软件资源：记录软件名称、版本、下载地址、安装说明等扩展信息。
- 轻量听歌模块：学习、阅读、写代码时可以播放背景音乐。

用一句初学者能懂的话说：

```text
这个网站不是单纯静态网页，而是一个带后台、数据库、权限、收藏、上传、音乐模块的全栈网站。
```

“全栈”的意思是：前台页面、后台页面、接口、数据库、登录权限、部署运维都在同一个项目里。用户看到的是网页，但网页背后有很多服务在工作。

不同角色能做的事情也不同：

- 游客可以浏览公开内容、搜索内容、进入 `/music` 听已发布音乐。游客收藏会先存在浏览器本地。
- 普通用户可以注册、登录、维护个人资料、使用数据库收藏。普通用户不能进入后台。
- 管理员可以进入 `/admin` 后台，管理内容、分类、标签、用户、轮播图、公告、音乐、上传图片，并查看操作日志。

为什么要做成完整网站？因为只做静态网页只能展示固定内容，不能方便地登录、发布文章、上传封面、分类管理、收藏同步、后台审核和部署恢复。这个项目的目标是让“内容长期可管理”，而不是每次改内容都去改代码。

## 2. 从第一天到现在的大致时间线

下面按真实 Git 提交记录复盘项目演进。提交顺序来自：

```bash
git log --oneline --decorate --reverse
```

当前提交记录是：

```text
7eac766 chore: establish project baseline
b0798e8 test: verify admin permission boundaries
66a6586 feat: improve admin markdown editor
98479aa feat: add frontend markdown rendering and highlighting
42662fd feat: move content before deleting categories
ec65d3d WIP: 标签合并功能开发中
c62bb3a feat: harden image uploads
a827617 chore: document safe docker cleanup
4013576 fix: improve Windows build cleanup
6bbf57b test: add playwright e2e coverage
89b6f7e docs: summarize p2 completion status
7d689c8 docs: add production launch checklist
c39783b feat: add music listening module
b51c686 style: move music entry to header icon
db6d79a docs: record reinstall backup and handoff
cb3694e fix: correct prisma permissions in docker runtime
```

### 阶段 1：项目初始化和基础架构

`7eac766 chore: establish project baseline`

这个阶段建立了项目骨架：Next.js App Router、TypeScript、Tailwind CSS、PostgreSQL、Prisma、NextAuth、Docker Compose 和 Caddy。也就是说，项目从一开始就不是“一个 HTML 文件”，而是按可部署的全栈网站来搭。

它解决的问题是：以后所有页面、API、数据库迁移、后台权限、Docker 部署都能在同一套结构里继续扩展。

### 阶段 2：后台权限验收

`b0798e8 test: verify admin permission boundaries`

这个阶段重点验证后台权限。后台不是靠“前端不显示按钮”来保护，而是在服务端判断当前 session 是否是管理员。

关键点：

- 未登录访问 `/admin` 会跳到 `/login`。
- 普通用户访问 `/admin` 会跳到 `/403`。
- 普通用户直接请求 `/api/admin/*` 会返回 403。
- 未登录请求后台 API 会返回 401。

对应测试命令是：

```bash
npm run test:permissions
```

### 阶段 3：后台内容管理

后台内容管理是项目核心。它包括内容列表、创建内容、编辑内容、预览内容、回收站、发布、下架、软删除、恢复、永久删除、批量操作等。

主要页面包括：

- `/admin/content`
- `/admin/content/create`
- `/admin/content/[id]/edit`
- `/admin/content/[id]/preview`
- `/admin/content/trash`

主要服务逻辑集中在 `services/content.ts`。这样做的好处是：API 不直接写一大堆数据库逻辑，而是调用服务层，方便复用和测试。

### 阶段 4：Markdown 编辑器完善

`66a6586 feat: improve admin markdown editor`

这个阶段增强后台编辑体验。Markdown 是一种用纯文本写格式的语法，例如 `# 标题`、`- 列表`、``` 代码块 ```。

后台编辑器支持：

- 编辑模式。
- 预览模式。
- 分屏模式。
- 代码块语言选择。
- Markdown 快捷按钮。
- 自动保存状态。

相关组件主要是：

- `components/admin-content-form.tsx`
- `components/markdown-preview.tsx`

### 阶段 5：前台 Markdown 渲染和代码高亮

`98479aa feat: add frontend markdown rendering and highlighting`

后台能写 Markdown 后，前台详情页也要正确显示 Markdown。这个阶段把前台详情页、后台预览页和编辑器预览统一接入 `components/markdown-preview.tsx`。

支持能力包括：

- GFM 表格。
- 任务列表。
- 代码块语言标记。
- 常用语言代码高亮。
- 复制代码按钮。
- 禁用原始 HTML。
- 过滤危险链接。

这里特别重要：Markdown 内容来自数据库，如果直接执行里面的 HTML，可能有 XSS 风险。所以项目选择“渲染安全 Markdown，不执行原始 HTML”。

### 阶段 6：分类移动后删除

`42662fd feat: move content before deleting categories`

如果某个分类下面还有内容，直接删除分类会造成内容变成无效分类。这个阶段实现了更安全的流程：

1. 发现分类下有内容。
2. 要求管理员选择目标分类。
3. 服务端在数据库事务里把内容移动过去。
4. 再删除原分类。
5. 写入操作日志。

对应测试：

```bash
npm run test:category-delete
```

### 阶段 7：标签合并

`ec65d3d WIP: 标签合并功能开发中`

Git 提交标题标记为 WIP，但当前 `docs/PROJECT_STATUS.md` 和实际文件显示标签合并功能已经存在：

- API：`app/api/admin/tags/[id]/merge/route.ts`
- 测试：`scripts/tag-merge-smoke.js`
- 命令：`npm run test:tag-merge`

功能是把源标签的内容关联迁移到目标标签，跳过重复关系，然后删除源标签，并记录操作日志。

### 阶段 8：上传安全增强

`c62bb3a feat: harden image uploads`

上传图片不是简单接收文件。项目增强了上传安全：

- 只允许 JPG/JPEG/PNG/WEBP。
- 检查 MIME。
- 检查文件签名，防止伪装文件。
- 检查图片宽高。
- 限制大小。
- 使用随机文件名。
- 删除接口只能删除受控路径。

主要文件：

- `app/api/admin/uploads/route.ts`
- `services/storage.ts`
- `scripts/upload-smoke.js`

对应测试：

```bash
npm run test:upload
```

### 阶段 9：Docker 空间安全清理文档

`a827617 chore: document safe docker cleanup`

Docker 构建多了会占磁盘空间，但不能为了释放空间乱删 volume。因为 volume 里可能是数据库、HTTPS 证书、上传文件。

项目增加了安全命令：

```bash
npm run docker:df
npm run docker:df:detail
npm run docker:clean:build-cache
npm run docker:clean:images
npm run docker:clean:containers
```

明确禁止随便执行：

```bash
docker volume prune
docker system prune -a --volumes
```

### 阶段 10：Windows 构建清理

`4013576 fix: improve Windows build cleanup`

Windows 下构建目录有时会被 Node、编辑器、杀毒软件或文件管理器锁住，导致 `EPERM`。项目通过 `next.config.ts` 的 `distDir` 做了区分：

- 本机默认使用 `.next-local-build`。
- Docker 构建用 `NEXT_DIST_DIR=.next-final`。

并增加了 `scripts/clean-build.js` 和 `npm run clean`，用于安全清理构建产物。

### 阶段 11：Playwright E2E 测试

`6bbf57b test: add playwright e2e coverage`

Playwright 是真实浏览器测试工具。它不是只测接口，而是像用户一样打开页面、登录、点击、填写表单。

测试目录：

- `tests/e2e/admin-permissions.spec.ts`
- `tests/e2e/content-flow.spec.ts`
- `tests/e2e/upload-and-category.spec.ts`

配置文件：

- `playwright.config.ts`

运行命令：

```bash
npm run test:e2e
```

注意：首次运行可能需要安装浏览器：

```bash
npx playwright install chromium
```

### 阶段 12：生产上线清单

`7d689c8 docs: add production launch checklist`

项目新增 `docs/PRODUCTION_CHECKLIST.md`，把上线前要核对的内容写清楚：

- 生产 `.env`。
- 强密码和强密钥。
- DNS 指向服务器。
- 80/443 端口开放。
- Docker volume 保护。
- Caddy HTTPS。
- 数据库迁移。
- 备份和恢复。
- 验收测试和回滚。

这个文档很重要，因为上线失败很多时候不是代码问题，而是域名、端口、证书、环境变量或网络问题。

### 阶段 13：音乐模块

`c39783b feat: add music listening module`

项目加入轻量听歌模块，定位是学习、阅读、写代码时播放背景音乐，不做大型音乐平台。

新增内容：

- 数据表：`MusicTrack`
- 迁移：`20260705000000_music_module`
- 前台页面：`/music`
- 后台页面：`/admin/music`
- 全站迷你播放器：`components/music/mini-player.tsx`
- 公共 API：`/api/music`、`/api/music/featured`、`/api/music/[id]/play`
- 后台 API：`/api/admin/music`、`/api/admin/music/[id]`
- 测试：`npm run test:music`

第一版只支持管理员填写合法音频 URL，不支持音频文件上传。这是为了降低版权风险、存储风险和转码复杂度。

### 阶段 14：音乐入口调整

`b51c686 style: move music entry to header icon`

音乐入口从首页大块区域调整为顶部右侧圆形音乐图标。点击图标只展开迷你播放器，不自动播放。这样做更轻量，不打扰用户阅读。

### 阶段 15：GitHub 备份和重装电脑恢复

`db6d79a docs: record reinstall backup and handoff`

这个阶段记录了重装电脑前后的恢复资料：

- GitHub 保存代码。
- 本地备份保存 `.env`、数据库 dump、上传文件、恢复步骤。
- 新增 `docs/HANDOFF_SNAPSHOT.md`。

特别注意：GitHub 只适合保存代码和文档，不适合保存 `.env`、数据库备份、上传文件和密码。

### 阶段 16：Docker Prisma 权限修复

`cb3694e fix: correct prisma permissions in docker runtime`

恢复后 app 容器曾出现 Prisma 权限问题：

```text
Error: Can't write to /app/node_modules/@prisma/engines
```

根因是运行阶段容器使用非 root 用户 `nextjs`，但 Prisma 相关目录来自构建阶段，权限不正确。后来通过 Dockerfile 中的 `COPY --chown=nextjs:nextjs` 和 `chown` 修复：

- `/app/node_modules/.prisma`
- `/app/node_modules/@prisma`
- `/app/node_modules/prisma`

同时 compose 启动命令改为使用本地 Prisma CLI：

```bash
./node_modules/.bin/prisma migrate deploy
```

这样避免运行时 `npx` 额外下载或写入不可写目录。

## 3. 当前项目最终状态

根据恢复过程和当前文档记录，项目已经在本机恢复到可运行状态：

- Git 当前 `HEAD` 和 `origin/main` 指向 `cb3694e`。
- 数据库容器 `db` 曾确认 healthy。
- 数据库备份 `database/fy_site.dump` 曾成功通过 `pg_restore` 导入。
- 数据库表已存在，包含 `MusicTrack` 和 `_prisma_migrations`。
- app 镜像构建成功，Docker Prisma 权限问题已通过 `cb3694e` 修复。
- app 容器曾启动成功。
- `prisma migrate deploy` 曾确认正常，没有需要用 `migrate reset` 的情况。
- 首页 `/` 曾返回 200。
- `/music` 曾返回 200。
- `/admin` 未登录时曾正确 307 跳转到登录。
- smoke tests 曾通过：权限、Markdown、分类删除、上传、音乐、lint、TypeScript、`git diff --check`。

当前需要特别说明：

- Playwright E2E 之前因为 Chromium 下载网络问题没有稳定完成当前恢复后的最终复跑。文档中不能伪造 E2E 通过。如果本机还没有浏览器，需要执行 `npx playwright install chromium`。
- 当前公网部署仍需要继续核验 DNS、Cloudflare、Caddy HTTPS、80/443 端口。Cloudflare 530 和 Caddy ACME 失败通常说明公网请求没有正确到达 Caddy。
- 当前工作区有一个 `docker/Caddyfile` 未提交修改，内容为 `dev.pzq1688.com`，这与用户后来说明“公域网站用 dev.pzq1688.com”有关，但它不是本次文档任务的业务代码修改。

## 4. 技术栈总览

### Next.js

Next.js 是这个项目的 Web 框架。它同时负责两件事：

1. 前端页面：用户在浏览器里看到的页面。
2. 后端 API：浏览器或前端组件请求的数据接口。

`app/` 目录是 Next.js App Router 的核心目录。里面的 `page.tsx` 表示页面，`layout.tsx` 表示页面外壳，`loading.tsx` 表示加载状态，`route.ts` 表示 API 路由。

`app/api/` 是后端接口目录。例如：

- `app/api/music/route.ts` 是公开音乐列表接口。
- `app/api/admin/music/route.ts` 是管理员音乐接口。
- `app/api/admin/uploads/route.ts` 是管理员上传接口。

为什么一个项目里既有前端又有后端？因为 Next.js 支持把页面和接口放在一起。这样前台、后台和 API 可以共享 TypeScript 类型、校验逻辑、权限逻辑和 Prisma 数据库访问。

### TypeScript

TypeScript 是带类型检查的 JavaScript。普通 JavaScript 写错字段名，很多时候要运行后才发现。TypeScript 可以在开发阶段发现一部分错误，例如函数参数类型不对、对象字段不存在。

本项目用 `npx tsc --noEmit` 做类型检查。`--noEmit` 的意思是只检查，不生成文件。

### Tailwind CSS

Tailwind CSS 负责页面样式。它的特点是很多样式通过 class 写在组件里，例如间距、颜色、布局。

这不是随便写 class，而是用 Tailwind 提供的工具类快速组合界面。项目中也有 `app/globals.css`，里面放全局样式和 Markdown 渲染样式。

### PostgreSQL

PostgreSQL 是数据库。数据库负责长期保存网站数据，包括：

- 用户。
- 登录会话。
- 内容。
- 分类。
- 标签。
- 收藏。
- 轮播图。
- 公告。
- 网站设置。
- 操作日志。
- 音乐。

如果没有数据库，网站重启后很多数据就没法保存。

### Prisma

Prisma 是 ORM。ORM 可以理解为“TypeScript 和数据库之间的翻译层”。

你在代码里不用手写很多 SQL，而是写：

```ts
prisma.content.findMany(...)
```

Prisma 会帮你生成对应的数据库查询。

`prisma/schema.prisma` 是数据库模型说明书。`prisma/migrations/` 是数据库结构变化记录。每次数据库结构正式变化，都应该通过 migration，而不是直接手工改生产数据库。

为什么不能乱用：

```bash
prisma migrate reset
```

因为它会重置数据库，通常意味着删除已有数据再重建。生产环境或恢复环境中乱用会造成数据丢失。

### Docker

Docker 用来把项目运行环境打包成容器。这样不用每次手工装 PostgreSQL、Node、Caddy，而是用 Compose 启动。

本项目主要有三类容器：

- `db`：PostgreSQL 数据库。
- `app`：Next.js 网站应用。
- `caddy`：反向代理和 HTTPS。

Docker volume 是持久化数据卷。容器可以删掉重建，但 volume 里的数据库、证书、上传文件不能乱删。

### Caddy

Caddy 是反向代理。它监听公网 80/443，然后把请求转发到 app 容器的 3000 端口。

它还可以自动申请 HTTPS 证书。证书申请成功的前提是：域名 DNS 正确指向服务器，80/443 能从公网访问，Cloudflare 代理模式和 Caddy 证书模式不冲突。

### Playwright

Playwright 是浏览器端到端测试工具。它会启动真实浏览器，模拟用户访问、登录、点击和填写表单。

它比简单接口测试更接近真实用户操作，但也更依赖环境：本机要装浏览器，网站要能访问，测试账号和数据库状态要正确。

## 5. 项目目录结构说明

### `app/`

放 Next.js 页面、布局和路由。谁会用它？前端页面、服务端页面、API 都会用。

修改时要注意：`page.tsx` 是页面，`route.ts` 是 API，不要把后台权限逻辑只写在页面里，API 也必须做权限校验。

### `app/api/`

放后端接口。比如：

- `app/api/auth/[...nextauth]/route.ts`：NextAuth 登录会话接口。
- `app/api/favorites/route.ts`：收藏接口。
- `app/api/music/route.ts`：公开音乐接口。
- `app/api/admin/*`：管理员接口。

修改时要注意：后台 API 必须调用 `requireAdminApi()`，写操作还要检查同源请求。

### `components/`

放 React 组件。组件是页面的积木。例如：

- `components/header.tsx`：顶部导航。
- `components/content-card.tsx`：内容卡片。
- `components/admin-content-form.tsx`：后台内容表单。
- `components/markdown-preview.tsx`：Markdown 渲染。

### `components/music/`

音乐模块前端组件：

- `mini-player.tsx`：右下角迷你播放器。
- `music-card.tsx`：音乐卡片。
- `music-player.tsx`：播放器逻辑。
- `music-types.ts`：音乐相关类型。

### `lib/`

放底层工具和公共逻辑：

- `lib/auth.ts`：NextAuth 配置。
- `lib/permissions.ts`：登录和管理员权限判断。
- `lib/prisma.ts`：Prisma Client 单例。
- `lib/validators.ts`：Zod 表单和 API 入参校验。
- `lib/security.ts`：同源检查、限流、客户端 IP。
- `lib/response.ts`：统一 API 返回格式。

修改时要注意：`lib/permissions.ts` 是安全边界，不要绕过。

### `services/`

放服务层，负责比较复杂的业务逻辑：

- `services/content.ts`：内容创建、更新、软删除、批量操作。
- `services/music.ts`：音乐查询、创建、更新、软删除、播放量。
- `services/storage.ts`：图片上传存储。
- `services/operation-log.ts`：操作日志。

服务层的好处是 API 文件保持简洁，复杂逻辑集中管理。

### `prisma/`

放数据库相关内容：

- `schema.prisma`：数据库模型。
- `migrations/`：迁移记录。
- `seed.ts`：初始化管理员和基础数据。
- `reset-admin.ts`：重置管理员。

### `prisma/migrations/`

当前迁移：

- `20260703000000_init`
- `20260703010000_content_management`
- `20260705000000_music_module`

迁移文件是数据库结构历史，不要手工乱删。

### `scripts/`

放脚本：

- smoke tests：权限、Markdown、分类删除、标签合并、上传、音乐。
- `clean-build.js`：清理构建目录。
- `backup-db.ps1` / `restore-db.ps1`：数据库备份恢复脚本。

### `tests/e2e/`

Playwright E2E 测试：

- `admin-permissions.spec.ts`
- `content-flow.spec.ts`
- `upload-and-category.spec.ts`
- `helpers/`

### `docs/`

放项目文档：

- `ARCHITECTURE.md`：架构说明。
- `DECISIONS.md`：技术决策。
- `PROJECT_STATUS.md`：当前状态。
- `NEXT_TASK.md`：后续任务。
- `PRODUCTION_CHECKLIST.md`：上线清单。
- `HANDOFF_SNAPSHOT.md`：重装恢复交接快照。
- `PROJECT_FULL_EXPLANATION.md`：本完整说明。

### `public/`

放公开静态文件。上传图片会以 `/uploads/...` 的 URL 访问。Docker 中 `/app/public/uploads` 挂载到 `uploaded-files` volume。

### `Dockerfile`

定义 app 镜像如何构建。它分为 `deps`、`builder`、`runner` 阶段，最终运行用户是 `nextjs`。

### `docker-compose.yml`

定义 db、app、caddy 三个服务，以及 `postgres-data`、`uploaded-files`、`caddy-data`、`caddy-config` 四个 volume。

### `docker/Caddyfile`

Caddy 反向代理配置。当前工作区版本是 `dev.pzq1688.com`，会把请求转发给 `app:3000`。

### `package.json`

记录依赖和脚本。初学者最常用的是：

```bash
npm install
npm run dev
npm run lint
npm run test:music
```

### `next.config.ts`

配置 Next.js，例如：

- `distDir`：构建目录。
- `output: "standalone"`：生成适合 Docker 运行的独立输出。
- `poweredByHeader: false`：关闭默认响应头。

### `middleware.ts`

在请求进入页面前做一层处理。当前用于：

- 保护 `/admin`。
- 未登录跳 `/login`。
- 非管理员跳 `/403`。
- 增加安全响应头。

### `.env.example`

环境变量示例。真实 `.env` 不应该提交 Git，因为里面有密码、密钥、数据库连接等敏感信息。

## 6. 前端页面说明

### 首页 `/`

首页展示网站主要内容入口、推荐内容、分类和最新内容。它从数据库读取公开内容，过滤掉草稿、下架、隐藏和软删除内容。

相关表：

- `Content`
- `Category`
- `Tag`

### 内容列表 `/contents`

展示公开内容列表，支持分类和标签筛选。数据来自 `lib/content.ts` 的公开查询逻辑。

### 内容详情 `/contents/[slug]`

根据 slug 找到一篇公开内容，显示标题、分类、标签、正文。正文通过 `components/markdown-preview.tsx` 渲染 Markdown。

相关表：

- `Content`
- `Category`
- `Tag`
- `ContentTag`

### 音乐页面 `/music`

展示已发布、未软删除的音乐。支持搜索标题、作者、专辑，也支持按分类筛选。

相关 API：

- `GET /api/music`
- `GET /api/music/featured`
- `POST /api/music/[id]/play`

相关表：

- `MusicTrack`

### 登录页面 `/login`

用户输入账号或邮箱和密码。NextAuth 负责校验密码和生成会话。

相关文件：

- `components/auth-form.tsx`
- `lib/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`

### 注册页面 `/register`

允许新用户创建账号。注册接口会做基础校验和限流。

相关 API：

- `POST /api/auth/register`

### 用户中心 `/profile`

登录用户可以修改个人资料和密码。

相关 API：

- `PATCH /api/profile`
- `PUT /api/profile`

### 收藏页面 `/favorites`

登录用户查看数据库收藏。游客收藏先存在 localStorage，登录后由 `components/favorite-sync.tsx` 同步。

相关表：

- `Favorite`
- `Content`

### 后台 `/admin`

后台控制台入口。整个后台由 `app/admin/layout.tsx` 调用 `requireAdmin()` 保护。

### 后台内容管理

- `/admin/content`：内容列表、筛选、批量操作。
- `/admin/content/create`：创建内容。
- `/admin/content/[id]/edit`：编辑内容。
- `/admin/content/[id]/preview`：管理员预览。
- `/admin/content/trash`：回收站。
- `/admin/contents`：旧路径兼容跳转。

管理员操作会写入数据库，重要操作会写入 `OperationLog`。

### 后台分类和标签

- `/admin/categories`：分类管理。
- `/admin/tags`：标签管理。

分类删除和标签合并都在服务端事务内完成，避免数据变乱。

### 后台音乐 `/admin/music`

管理员可以：

- 新增音乐。
- 编辑音乐。
- 软删除音乐。
- 设置发布/禁用。
- 设置首页推荐。
- 设置排序。
- 填写封面 URL 或复用图片上传。
- 填写音频 URL。
- 填写来源和授权说明。

### 后台日志 `/admin/logs`

显示操作日志。日志用于以后排查是谁做了什么操作。

### 其他后台页面

- `/admin/users`：用户管理。
- `/admin/banners`：轮播图管理。
- `/admin/announcements`：公告管理。
- `/admin/settings`：网站设置展示。

其中部分运营功能已有展示或基础管理能力，后续仍可继续完善。

## 7. 后端 API 说明

### 权限相关

未登录访问后台页面：

- `middleware.ts` 会跳转 `/login?callbackUrl=...`。

普通用户访问后台页面：

- 会跳转 `/403`。

后台 API：

- 未登录返回 401。
- 非管理员返回 403。
- 管理员才能继续执行。

核心文件：

- `middleware.ts`
- `lib/permissions.ts`
- `lib/auth.ts`

为什么页面权限和 API 权限都要做？因为用户可以不通过页面，直接用工具请求 API。如果 API 不校验，隐藏按钮没有任何安全意义。

### 内容管理 API

主要路径：

- `GET /api/admin/contents`
- `POST /api/admin/contents`
- `GET /api/admin/contents/[id]`
- `PATCH /api/admin/contents/[id]`
- `DELETE /api/admin/contents/[id]`
- `POST /api/admin/contents/[id]/restore`
- `DELETE /api/admin/contents/[id]/purge`
- `POST /api/admin/contents/batch`

支持能力：

- 创建内容。
- 编辑内容。
- 发布。
- 下架。
- 软删除。
- 回收站恢复。
- 永久删除。
- 批量发布、下架、删除、推荐、置顶、移动分类。

### 分类和标签 API

分类：

- `GET/POST /api/admin/categories`
- `PATCH/DELETE /api/admin/categories/[id]`

有内容的分类不能直接删除，需要移动内容后删除。

标签：

- `GET/POST /api/admin/tags`
- `PATCH/DELETE /api/admin/tags/[id]`
- `POST /api/admin/tags/[id]/merge`

标签合并当前已在项目文件中实现，并有 `npm run test:tag-merge`。

### 上传 API

路径：

- `POST /api/admin/uploads`
- `DELETE /api/admin/uploads`

上传主要用于封面图。支持 JPG/JPEG/PNG/WEBP。接口会检查：

- 文件大小。
- MIME。
- 文件签名。
- 图片宽高。
- 管理员权限。
- 同源请求。

删除接口只能删除形如 `/uploads/covers/<uuid>.<ext>` 的受控路径，不能让用户传 `../../.env` 这种危险路径。

### 音乐 API

公开接口：

- `GET /api/music`
- `GET /api/music/featured`
- `POST /api/music/[id]/play`

后台接口：

- `GET/POST /api/admin/music`
- `GET/PATCH/DELETE /api/admin/music/[id]`

规则：

- 前台只能读取已发布、未软删除音乐。
- 后台接口必须管理员权限。
- 播放量接口只对已发布音乐计数，并做基础防刷。
- 第一版只支持音频 URL，不支持音频文件上传。

## 8. 数据库设计说明

数据库模型来自 `prisma/schema.prisma`。

### `User`

存用户账号。重要字段：

- `email`：邮箱，唯一。
- `passwordHash`：密码哈希，不保存明文密码。
- `nickname`：昵称。
- `role`：角色，`USER` 或 `ADMIN`。
- `status`：状态，`ACTIVE`、`DISABLED`、`DELETED`。

它关联收藏、会话、内容创建者、操作日志、音乐创建者等。

### `Account`

NextAuth 用的账户表。当前主要为认证体系预留，支持 provider 账号关联。

### `Session`

NextAuth 会话表，保存登录 session token 和过期时间。

### `VerificationToken`

验证 token 表，认证流程可用。

### `Content`

网站内容主表。重要字段：

- `title`：标题。
- `slug`：URL 别名，唯一。
- `summary`：简介。
- `content`：正文 Markdown。
- `coverImage`：封面。
- `contentType`：内容类型。
- `status`：草稿、已发布、下架、隐藏。
- `isFeatured`：推荐。
- `isPinned`：置顶。
- `isHidden`：隐藏。
- `allowFavorite`：是否允许收藏。
- `viewCount`：浏览数。
- `favoriteCount`：收藏数。
- `deletedAt`：软删除时间。
- `publishedAt`：发布时间。

前台只展示 `PUBLISHED`、未软删除、未隐藏的内容。

### `Category`

分类表。内容可以属于一个分类。重要字段：

- `name`
- `slug`
- `description`
- `isEnabled`
- `sortOrder`

分类删除时，如果还有内容，需要先移动内容。

### `Tag`

标签表。标签和内容是多对多关系。

### `ContentTag`

内容和标签的关联表。它的主键是 `contentId + tagId`，表示同一篇内容不能重复绑定同一个标签。

这就是“关联表”：当 A 和 B 是多对多关系时，用第三张表保存关系。

### `Favorite`

收藏表。重要字段：

- `userId`
- `contentId`
- `createdAt`

有唯一约束 `userId + contentId`，防止同一个用户重复收藏同一篇内容。

### `Banner`

轮播图表。保存标题、副标题、图片、链接、排序和启用状态。

### `Announcement`

公告表。保存公告标题、内容、是否启用、生效时间范围。

### `SiteSetting`

网站设置表。用 `key/value` 保存设置项。当前后台设置能力还可以继续完善。

### `OperationLog`

操作日志表。记录管理员做过什么操作，例如创建、更新、删除、发布、下架、恢复。

### `PasswordResetToken`

密码重置 token 表。模型已存在，但完整忘记密码邮件流程仍属于后续待完善事项。

### `ContentResourceDetail`

软件、下载类内容的扩展表。这样 `Content` 主表不用塞太多只在软件资源里才需要的字段。

字段包括：

- 软件名。
- 版本。
- 支持系统。
- 文件大小。
- 官网。
- 下载地址。
- 提取码。
- 安装说明。
- 是否登录后下载。

### `MusicTrack`

音乐表。重要字段：

- `title`：歌曲标题。
- `artist`：作者。
- `album`：专辑。
- `coverImage`：封面。
- `audioUrl`：音频 URL。
- `sourceUrl`：来源地址。
- `license`：授权说明。
- `category`：音乐分类。
- `duration`：时长。
- `sortOrder`：排序。
- `isPublished`：是否发布。
- `isFeatured`：是否推荐。
- `playCount`：播放量。
- `deletedAt`：软删除。

音乐也使用软删除，是为了避免误删后无法恢复，同时保留后台管理记录。

### 关键概念

软删除 `deletedAt`：不是真的从数据库删掉，而是填上删除时间。前台查询会过滤掉它，后台回收站还能恢复。

发布状态：草稿不会给普通用户看，已发布才会公开，下架内容也不会在前台显示。

推荐 `isFeatured`：用于首页或推荐区域优先展示。

置顶 `isPinned`：用于排序时放到更靠前。

## 9. 权限系统说明

项目里主要有三类人：

- 游客：没登录。
- 普通用户：登录了，但不是管理员。
- 管理员：登录了，并且角色是 `ADMIN`。

游客能看公开内容，不能进入后台。普通用户能收藏、编辑个人资料，但不能进入后台。管理员能进入后台并调用后台 API。

如果强行访问：

- 游客访问 `/admin`：跳到 `/login`。
- 普通用户访问 `/admin`：跳到 `/403`。
- 游客请求后台 API：401。
- 普通用户请求后台 API：403。

为什么不能只靠前端隐藏按钮？因为任何人都可以绕过页面，直接请求接口。真正的安全判断必须在服务端。

相关测试：

```bash
npm run test:permissions
```

它覆盖后台页面和后台 API 的权限边界。

## 10. 内容管理完整流程

1. 管理员进入 `/login` 登录。
2. 登录成功后进入 `/admin`。
3. 打开 `/admin/content`。
4. 点击创建，进入 `/admin/content/create`。
5. 填标题、简介、分类、标签、正文。
6. 正文使用 Markdown 编辑器，可以编辑、预览或分屏。
7. 自动保存会把草稿状态保存下来，避免内容丢失。
8. 点击发布后，服务端检查标题、slug、分类、标签等是否合法。
9. 发布成功后，前台列表和详情页可以看到。
10. 如果下架，前台不再显示，但后台还能编辑。
11. 如果删除，先进入回收站，这是软删除。
12. 回收站可以恢复，也可以永久删除。

草稿为什么普通用户看不到？因为它还没准备好公开。

下架内容为什么前台看不到？因为管理员可能发现内容过期或有问题。

软删除为什么还能恢复？因为删除只是设置 `deletedAt`，没有立刻删数据库记录。

操作日志记录管理员对内容、分类、标签、用户等做过的写操作，方便以后追踪。

## 11. Markdown 系统说明

Markdown 是一种轻量文本格式。你写：

````markdown
# 标题

- 列表
- 列表

```js
console.log("hello");
```
````

页面会显示成标题、列表和代码块。

后台编辑器支持：

- 编辑。
- 预览。
- 分屏。
- 代码块语言选择。
- Markdown 快捷操作。
- 清除格式。
- 扩大编辑区域。

GFM 是 GitHub Flavored Markdown，意思是 GitHub 风格 Markdown。它支持表格、任务列表等扩展语法。

前台渲染：

- `components/markdown-preview.tsx` 负责统一渲染。
- `react-markdown` 负责 Markdown 转 React。
- `remark-gfm` 支持 GFM。
- `react-syntax-highlighter` 做代码高亮。

代码复制按钮只复制文本，不执行代码。

为什么不执行原始 HTML？因为如果用户写进 `<script>` 或危险 HTML，浏览器执行后可能造成 XSS 攻击。

为什么要过滤危险链接？因为 `javascript:`、`data:` 之类链接可能诱导浏览器执行危险内容。

限制：

```text
structured-text 当前按纯文本显示。
```

相关测试：

```bash
npm run test:markdown
```

## 12. 上传系统说明

上传主要用于封面图。当前支持：

- JPG/JPEG。
- PNG。
- WEBP。

上传过程会限制：

- 文件大小，默认可通过 `MAX_UPLOAD_MB` 配置。
- 图片宽高，默认最大 4096x4096。
- MIME 类型。
- 文件真实签名。

为什么伪装文件会被拒绝？因为攻击者可能把脚本文件改名成 `.png`。项目会检查文件内容开头的签名，而不只看扩展名。

为什么文件名要随机？避免用户上传同名文件互相覆盖，也避免通过文件名暴露原始信息。

为什么不能返回服务器绝对路径？因为 `/app/public/uploads/...` 这种路径是服务器内部路径，暴露它没有意义，还可能泄露部署结构。接口返回的是浏览器可访问的 URL，例如 `/uploads/covers/...`。

为什么上传目录要持久化？如果文件只存在容器内部，容器重建后就丢了。因此 Docker 使用：

```text
uploaded-files:/app/public/uploads
```

存储 Provider：

- 默认 `STORAGE_PROVIDER=local`，文件写入 `LOCAL_UPLOAD_DIR`，Docker 使用 `uploaded-files` volume 持久化。
- `STORAGE_PROVIDER=s3` 或 `r2` 时，通过 AWS SDK v3 写入 Cloudflare R2 / S3 兼容 bucket，公开 URL 由 `S3_PUBLIC_BASE_URL` 生成。
- 对象存储需要 region、bucket、access key、secret 和公开基址；R2/S3 兼容服务还需要 endpoint，标准 AWS S3 可留空。缺少配置时上传明确失败，不会悄悄写回本地。
- 真实密钥只能放在 `.env` 或部署平台安全变量，不能提交 Git。
- local 和对象存储共用图片大小、MIME、真实签名与宽高校验。key 固定由服务端生成，删除接口不能删除任意路径或 bucket 文件。
- 切换 Provider 不会自动迁移已有图片。对象存储中的新文件不依赖 local volume，但既有 `uploaded-files` 仍需保留和备份。

相关测试：

```bash
npm run test:upload
```

## 13. 音乐模块说明

音乐模块加入的目的，是让网站有一个学习、阅读、写代码时的背景音乐角落。它不是大型音乐平台，不做复杂推荐、不做商业音乐托管、不做盗版下载。

为什么不自动播放？浏览器通常限制自动播放，而且自动播放会打扰用户。当前设计是用户主动点击后才播放。

为什么第一版只支持音频 URL？因为音频文件上传会带来更大的存储、版权、转码和带宽问题。URL 模式更轻量，也更容易控制第一版范围。

版权注意事项：管理员只能填写自己有权使用、公开授权或允许外链播放的音频地址。项目不应该托管或引用未经授权的商业音乐。

### 前台

前台包括：

- 顶部右侧圆形音乐入口。
- `/music` 音乐小角落。
- 全站右下角迷你播放器。
- 播放、暂停、上一首、下一首。
- 搜索和分类筛选。

相关组件：

- `components/music/music-player.tsx`
- `components/music/mini-player.tsx`
- `components/music/music-card.tsx`

### 后台

后台入口：

- `/admin/music`

管理员可以：

- 新增音乐。
- 编辑音乐。
- 软删除音乐。
- 发布 / 禁用。
- 首页推荐。
- 排序。
- 封面上传或填写封面 URL。
- 填写音频 URL。
- 填写授权说明。

### 数据库

音乐数据存在 `MusicTrack` 表。

### API

公开 API：

- `GET /api/music`
- `GET /api/music/featured`
- `POST /api/music/[id]/play`

后台 API：

- `GET/POST /api/admin/music`
- `GET/PATCH/DELETE /api/admin/music/[id]`

### 测试

```bash
npm run test:music
```

该测试覆盖公开读取、发布过滤、后台权限、新增编辑软删除、非法 URL、推荐接口和播放量基础防刷。

## 14. Docker 和部署说明

`Dockerfile` 构建 app 镜像分三步：

1. `deps`：安装依赖。
2. `builder`：复制代码，执行 `npx prisma generate`，执行 `npm run build`。
3. `runner`：复制 standalone 产物，用非 root 用户运行。

最终运行用户是：

```text
nextjs
```

`docker-compose.yml` 启动三个服务：

- `db`：PostgreSQL。
- `app`：Next.js 网站。
- `caddy`：公网反向代理和 HTTPS。

为什么 app 需要连接 db？因为页面、API、登录、内容、音乐、收藏都要读写数据库。

为什么要执行：

```bash
prisma migrate deploy
```

因为部署时数据库结构必须和代码模型一致。`migrate deploy` 会应用已经提交的迁移，但不会像 `migrate reset` 那样清空数据库。

恢复后遇到的 Prisma 权限问题是：

```text
runner 使用 nextjs 用户，但 node_modules ownership 不正确，导致 Prisma 不能写 engines。
后来通过 COPY --chown 和 chown Prisma 目录修复。
```

最新修复提交：

```text
cb3694e fix: correct prisma permissions in docker runtime
```

修复后 Dockerfile 中：

- `COPY --chown=nextjs:nextjs` 复制运行需要的目录。
- `chown` 修复 `/app/public/uploads` 和 Prisma 相关目录。
- `USER nextjs` 保持非 root 运行。

Compose 中 app 启动命令：

```bash
./node_modules/.bin/prisma migrate deploy && npm run seed && node server.js
```

这样使用本地已安装 Prisma CLI，避免运行时 `npx` 引发额外写入问题。

## 15. Docker volume 和数据安全

volume 可以理解为“容器外面的持久硬盘”。容器删了，volume 还在。

本项目重要 volume：

- `postgres-data`：数据库数据。
- `uploaded-files`：上传图片。
- `caddy-data`：Caddy 证书和账户数据。
- `caddy-config`：Caddy 运行配置数据。

为什么不能乱删？因为删掉 `postgres-data` 可能丢数据库，删掉 `uploaded-files` 可能丢封面图，删掉 `caddy-data` 可能丢 HTTPS 证书状态。

禁止：

```bash
docker volume prune
docker system prune -a --volumes
```

安全查看：

```bash
npm run docker:df
npm run docker:df:detail
```

安全清理：

```bash
npm run docker:clean:build-cache
npm run docker:clean:images
npm run docker:clean:containers
```

这些命令不会清理 volume。

## 16. Git 和 GitHub 备份说明

Git 是版本控制工具，记录代码每次变化。GitHub 是远程代码仓库，用来保存和同步代码。

为什么代码要推到 GitHub？因为电脑重装或硬盘损坏后，可以重新 clone 代码。

为什么 `.env`、数据库、上传文件不能进 GitHub？

- `.env` 有密码、Token、密钥。
- 数据库 dump 可能包含用户和内容数据。
- 上传文件可能很大，也可能有隐私或版权问题。

当前 Git log 显示项目已经从基线提交发展到 `cb3694e`。恢复过程中曾从 GitHub 切到 `origin/main` 最新版本，再用本地备份恢复 `.env`、数据库和上传文件。

常用命令：

```bash
git status
git log --oneline
git push origin main
```

如果 `git push origin main` 显示：

```text
Everything up-to-date
```

说明本地已提交内容和 GitHub 远程分支一致，没有新的提交需要推送。

## 17. 重装电脑恢复流程说明

完整恢复流程可以理解为：代码从 GitHub 来，秘密和数据从本地备份来，运行环境由 npm 和 Docker 重建。

1. clone GitHub 仓库。

```bash
git clone <repo-url>
```

2. 放回 `.env`。

`.env` 不在 GitHub，需要从备份恢复。不要打印里面的真实值。

3. 放回数据库备份。

备份文件示例：

```text
database/fy_site.dump
```

4. 放回上传文件。

上传文件目录：

```text
public/uploads
```

Docker 运行时还要确认 `uploaded-files` volume 是否需要同步。

5. 安装依赖。

```bash
npm install
npx prisma generate
```

6. 启动数据库。

```bash
docker compose up -d db
```

7. 导入数据库 dump。

```bash
docker compose cp database/fy_site.dump db:/tmp/fy_site.dump
docker compose exec -T db sh -lc 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/fy_site.dump'
```

8. 构建 app。

```bash
docker compose up -d --build app
```

9. 执行迁移。

```bash
docker compose exec -T app npx prisma migrate deploy
```

当前 Docker 启动命令已经使用本地 CLI，但手工执行这个命令仍可用于检查迁移状态。

10. 检查页面。

```bash
curl -I http://localhost:3000
curl -I http://localhost:3000/music
curl -I http://localhost:3000/admin
```

11. 运行测试。

```bash
npm run lint
npx tsc --noEmit
npm run test:permissions
npm run test:markdown
npm run test:category-delete
npm run test:upload
npm run test:music
git diff --check
```

恢复中遇到的问题：

- Docker Hub EOF：拉镜像或 npm 网络不稳定，属于外部网络问题。
- 代理问题：Docker 代理配置指向不可达地址时会导致 pull 超时。
- `node:24-alpine` 拉取问题：后来通过解决镜像拉取或镜像源后继续构建。
- Prisma engines 权限问题：通过 `cb3694e` 修 Dockerfile ownership 和 compose 命令。
- Playwright Chromium 缺失：需要 `npx playwright install chromium`，但下载可能受网络影响。

## 18. 测试体系说明

当前 `package.json` 中真实存在的测试或检查命令如下。

### `npm run lint`

检查 ESLint 规则。失败通常说明代码风格或潜在问题不符合规则。

### `npx tsc --noEmit`

TypeScript 类型检查。失败通常说明类型不匹配、字段不存在或导入有问题。

### `npm run test:permissions`

权限 smoke test。检查游客、普通用户、管理员访问后台页面和 API 的行为。

### `npm run test:markdown`

Markdown smoke test。检查 Markdown 渲染、安全过滤、代码块、表格、预览等。

### `npm run test:category-delete`

检查分类下有内容时不能直接删除，以及选择目标分类后能移动内容再删除。

### `npm run test:tag-merge`

检查标签合并，把源标签关联迁移到目标标签，并跳过重复关系。

### `npm run test:upload`

检查上传权限、伪装文件、超宽图片、非法删除路径、管理员上传和删除。

### `npm run test:music`

检查音乐模块公开读取、后台权限、增改删、非法 URL、推荐和播放量。

### `npm run test:e2e`

Playwright 浏览器测试。失败可能是功能问题，也可能是浏览器没安装、网站没启动、测试账号不对、网络下载失败。

### `git diff --check`

检查 Git diff 里是否有尾随空格、空白错误等。文档提交前也建议跑。

## 19. 当前仍未完成或以后可以做的事

以下内容来自 `docs/NEXT_TASK.md`、`docs/PROJECT_STATUS.md` 和 `docs/PRODUCTION_CHECKLIST.md` 的整理。

### 上线前必须做

- 生产 `.env` 核验：强密码、强密钥、正确 URL。
- DNS 指向服务器，当前公网站点要确认 `dev.pzq1688.com`。
- 80/443 放行。
- Caddy HTTPS 正常签发证书。
- 数据库备份可用。
- 上传文件备份可用。
- `docker compose up -d --build` 在目标服务器成功。
- smoke tests 通过。
- E2E 如果要作为上线门禁，需要先安装 Chromium 并跑通。

### 上线后可以做

- 对象存储 Provider 已完成 R2/S3 兼容接入；后续工作是生产凭据配置与既有文件迁移方案，必要时再评估 OSS/COS 专用能力。
- 网站设置后台编辑保存。
- 公告 / 轮播图更完整运营功能。
- sitemap / robots / SEO 深度验收。
- 独立 app HTTP healthcheck。
- 生产监控、告警和日志保留。

### 长期优化

- CI 自动化测试。
- 更完整 E2E。
- 忘记密码完整邮件流程。
- 用户注销。
- 音频上传或对象存储音乐库。
- 音乐歌词、播放列表持久化、音乐收藏。
- 跨浏览器测试矩阵。

## 20. 给初学者的学习路线

1. 先学 HTML / CSS / JavaScript。

   看 `app/page.tsx` 和 `components/content-card.tsx`，理解页面结构、样式和交互。

2. 再学 React。

   看 `components/`。组件就是可复用的页面积木。

3. 再学 Next.js 页面和 API。

   看 `app/contents/page.tsx` 和 `app/api/music/route.ts`。一个是页面，一个是接口。

4. 再学数据库 PostgreSQL。

   先理解“表”和“字段”，再看 `prisma/schema.prisma`。

5. 再学 Prisma。

   看 `services/content.ts`、`services/music.ts`，理解代码如何读写数据库。

6. 再学权限和 Session。

   看 `lib/auth.ts`、`lib/permissions.ts`、`middleware.ts`。

7. 再学 Docker。

   看 `Dockerfile` 和 `docker-compose.yml`，理解 app、db、caddy 怎么一起运行。

8. 再学 Git 和 GitHub。

   用 `git log --oneline` 看项目怎么一步步发展。

9. 再学测试。

   从 `scripts/permission-smoke.js` 这种 smoke test 开始，再看 `tests/e2e/`。

10. 最后学部署和运维。

   看 `docs/PRODUCTION_CHECKLIST.md`，理解域名、HTTPS、端口、备份、回滚。

快速对照：

- 想理解数据库，就看 `prisma/schema.prisma`。
- 想理解后台权限，就看 `lib/permissions.ts` 和 `middleware.ts`。
- 想理解音乐模块，就看 `app/music`、`app/admin/music`、`components/music`、`services/music.ts`。
- 想理解上传，就看 `app/api/admin/uploads/route.ts` 和 `services/storage.ts`。
- 想理解 Docker，就看 `Dockerfile`、`docker-compose.yml`、`docker/Caddyfile`。

## 21. 常见问题解释

### 为什么网页项目也需要后端？

因为登录、发布内容、上传图片、收藏、后台管理都不能只靠浏览器完成。后端负责安全校验和数据库读写。

### 为什么要用数据库？

数据库负责长期保存数据。没有数据库，用户、文章、收藏、音乐、日志都很难可靠保存。

### 为什么不能把密码写进代码？

代码会提交 GitHub。密码写进代码就可能泄露。

### 为什么不能提交 `.env`？

`.env` 里有真实密钥、密码、数据库连接和管理员账号信息。

### 为什么 Docker volume 不能乱删？

volume 里可能是数据库、HTTPS 证书和上传文件。删了可能导致网站数据丢失。

### 为什么要用 Prisma migration？

migration 是数据库结构变化记录。它能让本机、Docker、服务器按同一套步骤升级数据库。

### 为什么不能用 `migrate reset`？

它会重置数据库，可能清空数据。恢复和生产环境禁止乱用。

### 为什么后台权限不能只靠前端隐藏按钮？

因为用户可以绕过按钮直接请求 API。真正权限必须在服务端判断。

### 为什么要做测试？

测试能防止改了 A 功能把 B 功能弄坏。权限、上传、Markdown、音乐这类功能尤其需要测试。

### 为什么 Playwright 需要安装浏览器？

Playwright 是用真实浏览器测试页面，它需要 Chromium 这类浏览器二进制文件。

### 为什么有时候 Docker pull 会失败？

Docker pull 要访问 Docker Hub 或镜像源。网络、代理、DNS、认证服务都可能导致 EOF、timeout、ECONNRESET。

### 为什么重装电脑后还要恢复数据库和上传文件？

GitHub 保存的是代码，不保存数据库数据和上传文件。重装后必须从备份恢复。

### 为什么 GitHub 不保存数据库？

数据库可能很大，也包含隐私数据和运行数据。GitHub 适合版本控制代码，不适合保存生产数据。

## 22. 重要命令速查表

### 开发

```bash
npm install
npm run dev
```

`npm install` 安装依赖。`npm run dev` 启动本地开发服务器。

### 检查

```bash
npm run lint
npx tsc --noEmit
```

检查代码规则和 TypeScript 类型。

### Prisma

```bash
npx prisma generate
docker compose exec -T app npx prisma migrate deploy
```

`generate` 生成 Prisma Client。`migrate deploy` 应用已提交迁移。

### Docker

```bash
docker compose up -d db
docker compose up -d --build app
docker compose ps
docker compose logs --tail=120 app
```

用于启动数据库、构建 app、查看容器状态和日志。

### 测试

```bash
npm run test:permissions
npm run test:markdown
npm run test:category-delete
npm run test:upload
npm run test:music
npm run test:e2e
```

如果需要标签合并测试：

```bash
npm run test:tag-merge
```

### Git

```bash
git status
git log --oneline
git add .
git commit -m "说明"
git push origin main
```

`git status` 看工作区状态。`git log` 看提交历史。提交前要确认 `.env`、数据库 dump、上传文件没有被 add。

### 禁止或危险命令

```bash
prisma migrate reset
docker volume prune
docker system prune -a --volumes
git reset --hard
git clean -fd
```

危险原因：

- `prisma migrate reset` 可能清空数据库。
- `docker volume prune` 可能删除数据库、证书、上传文件。
- `docker system prune -a --volumes` 更危险，会清理镜像、缓存和 volume。
- `git reset --hard` 会丢弃本地修改。
- `git clean -fd` 会删除未跟踪文件，可能删掉备份资料。

## 23. 文档结尾

现在这个项目已经不是简单网页，而是完整全栈项目。它已经包含：

- 前台页面。
- 后台管理。
- 数据库。
- 登录和权限。
- 收藏。
- 上传。
- Markdown。
- 音乐。
- Docker。
- Caddy。
- 测试。
- 重装恢复流程。

目前最重要的是上线前核验，而不是继续无限加功能。尤其要先确认生产 `.env`、DNS、80/443、Caddy HTTPS、数据库备份、上传文件备份、smoke tests 和 E2E 环境。

初学者理解这个项目，不要一上来试图读完所有代码。建议从一条功能链路开始：

```text
管理员登录 -> 创建一篇文章 -> 发布 -> 前台详情页显示 -> 收藏 -> 后台下架或删除
```

这条链路会带你经过页面、API、权限、服务层、数据库、Markdown 渲染和测试，是理解“全栈项目”的最好入口。

## 24. 当前最终生产状态

截至 2026-07-13，正式公网入口为 `https://pzq1688.com`。Cloudflare Tunnel `fy-site-tunnel` 的 Connector 为 Healthy，并将公网请求转发到本机 `HTTP localhost:3000` 服务。首页和音乐页已验证可访问，未登录访问后台会跳转登录页。

生产环境的 `NEXTAUTH_URL` 与 `NEXT_PUBLIC_SITE_URL` 均使用正式域名。图片上传默认使用 `STORAGE_PROVIDER=r2` 写入 Cloudflare R2；本地开发仍可通过 `STORAGE_PROVIDER=local` 保持原有目录和 volume 行为。R2 公共图片不经过 Next.js 图片优化器，而是由 `PublicImage` 以 `unoptimized` 方式直连，避免 Docker 网络中 R2 域名解析为 `198.18.x.x` 时被优化器按私网地址拦截。

日常维护应先同步代码，完成 lint、TypeScript 和相关 smoke test，再提交和推送。上线后还应持续做 E2E、备份恢复演练、日志与健康检查、Tunnel 状态检查、R2 生命周期/备份以及管理员真实登录回调复核。
