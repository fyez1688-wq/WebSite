# Next Task

## P0：必须先完成的安全问题

### 已完成：移除或修改 `admin / admin`

- 目标：生产和长期开发环境不得继续使用 `admin/admin`。
- 涉及文件：`.env`、`.env.example`、`README.md`、`prisma/seed.ts`。
- 验收条件：`.env.example` 使用占位密码；本地 `.env` 使用强密码；README 不鼓励使用弱密码；旧 `admin/admin` 不能登录。
- 已运行：`npm run lint`、`docker compose up -d --build app`、`docker compose exec -T app npm run admin:reset`、HTTP 登录后台验证。
- 结果：`admin@pzq1688.local` 可登录 `/admin`；旧 `admin/admin` 返回 401；数据库中旧 `admin` 状态为 `DISABLED`。
- 遗留风险：Windows 本机 `npm run admin:reset` 因 `tsx`/esbuild `spawn EPERM` 失败；容器内可执行。旧的未引用文件 `scripts/reset-admin.ts` 删除被 Windows 拒绝，后续文件锁解除后移除。

### 已完成：后台权限验收

- 目标：系统化验证未登录、普通用户、管理员三种角色访问后台页面和 API 的行为。
- 涉及文件：`lib/permissions.ts`、`middleware.ts`、`scripts/permission-smoke.js`、`package.json`。
- 验收条件：未登录跳登录，普通用户 403，管理员可访问；普通用户直接调用后台 API 返回 403。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`docker compose up -d --build app`、`npm run test:permissions`。
- 结果：权限 smoke test 已通过；后台 API 未登录返回 401，普通用户返回 403，管理员返回 200。
- 风险：`middleware.ts` 在 Next 16 中提示约定已弃用，后续仍应迁移到 `proxy.ts`，但本轮未处理该独立问题。

## P1：当前主要开发任务

### 已完成：Markdown 编辑器完善

- 目标：将 textarea 工具栏升级为更完整的 Markdown 编辑体验，支持预览、代码块语言、快捷键和更可靠的自动保存状态。
- 涉及文件：`components/admin-content-form.tsx`、`components/markdown-preview.tsx`。
- 验收条件：编辑内容不会丢失；代码块可选择语言；保存状态准确；移动端可编辑。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`docker compose up -d --build app`、`npm run test:permissions`。
- 结果：后台内容表单支持编辑/预览/分屏模式、代码块语言选择、快捷键、清除格式、扩大编辑区域和安全 React 预览；自动保存增加旧请求忽略保护。
- 风险：未引入第三方富文本编辑器；前台详情页和独立管理员预览页的 Markdown 渲染仍由下一项任务处理。

### 已完成：前台 Markdown 渲染与代码高亮

- 目标：前台详情和后台预览正确渲染 Markdown，并防止 XSS。
- 涉及文件：`components/markdown-preview.tsx`、`app/contents/[slug]/page.tsx`、`app/admin/content/[id]/preview/page.tsx`、`app/globals.css`、`scripts/markdown-smoke.js`。
- 验收条件：标题、列表、引用、链接、图片、代码块正常显示；危险 HTML 不执行。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`docker compose up -d --build app`。
- 结果：统一渲染组件已接入前台详情、管理员预览和后台编辑器预览；支持 GFM 表格、任务列表、自动链接、代码语言标记、代码复制按钮和安全过滤。
- 限制：代码高亮使用 Prism Light 注册常用语言；`structured-text` 按纯文本显示。预览页仍未实现短期预览令牌。

### 已完成：分类移动后删除

- 目标：分类下存在内容时支持移动到其他分类后删除。
- 涉及文件：`app/api/admin/categories/[id]/route.ts`、`components/admin-taxonomy-client.tsx`、`scripts/category-delete-smoke.js`。
- 验收条件：不能产生无效分类引用；操作有二次确认和日志。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`docker compose up -d --build app`。
- 结果：有关联内容的分类直接删除会失败；选择目标分类后，服务端事务内移动内容并删除原分类，操作日志写入，内容分类更新成功。
- 风险：后台 UI 目前使用浏览器原生 `confirm` 做二次确认，后续可替换为统一弹窗组件。

### 已完成：标签合并

- 目标：支持将重复标签合并到目标标签。
- 涉及文件：`app/api/admin/tags/*`、`components/admin-taxonomy-client.tsx`、`scripts/tag-merge-smoke.js`、`package.json`。
- 验收条件：内容关联迁移成功，重复关系不报错，源标签删除。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:tag-merge`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`docker compose up -d --build app`。
- 结果：后台标签管理可选择目标标签合并；服务端事务内迁移 `ContentTag` 关联，重复关系自动跳过，源标签删除并写入操作日志。
- 风险：后台 UI 目前使用浏览器原生 `confirm` 做二次确认，后续可替换为统一弹窗组件。

## P2：功能增强（已完成）

P2 阶段已完成并提交：

- `c62bb3a feat: harden image uploads`
- `a827617 chore: document safe docker cleanup`
- `4013576 fix: improve Windows build cleanup`
- `6bbf57b test: add playwright e2e coverage`

P2 总体验收已在 2026-07-04 执行。代码、类型、权限、Markdown、分类删除、上传和基础 Playwright E2E 验收均通过；Docker app 构建复验仍受 Docker Hub EOF/网络问题影响，未进入项目编译阶段。

### 已完成：上传安全增强

- 目标：增加图片宽高检查、删除接口、对象存储适配层。
- 涉及文件：`services/storage.ts`、`app/api/admin/uploads/route.ts`、`Dockerfile`、`docker-compose.yml`、`scripts/upload-smoke.js`、`package.json`、`.env.example`。
- 验收条件：非图片、超大图片、伪装图片、普通用户上传均失败。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:upload`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`git diff --check`。
- 结果：上传服务新增本地存储适配层，上传前解析 JPG/PNG/WEBP 宽高并限制默认最大 4096x4096；`DELETE /api/admin/uploads` 可删除受控上传图片；验收覆盖未登录 401、普通用户 403、伪装图片失败、超宽图片失败、非法删除路径失败、管理员上传和删除。
- 限制：对象存储只完成适配接口和本地实现，R2/S3/OSS/COS 外部 Provider 尚未接入。

### 已完成：Playwright E2E 测试

- 目标：建立稳定、可重复运行的基础浏览器端到端测试，覆盖登录、后台权限、内容主流程、上传和分类移动后删除。
- 涉及文件：`playwright.config.ts`、`tests/e2e/*`、`package.json`、`README.md`、`docs/PROJECT_STATUS.md`。
- 验收条件：测试可在本地和 CI 执行，失败能定位问题。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run test:permissions`、`npm run test:markdown`、`npm run test:category-delete`、`npm run test:upload`、`npm run test:e2e`、`git diff --check`。
- 结果：新增 `test:e2e`、`test:e2e:ui`、`test:e2e:headed`；E2E 覆盖未登录/普通用户/管理员后台权限，内容草稿、发布、下架、回收站恢复，Markdown 前台渲染，上传权限与合法图片上传，分类移动后删除。
- 限制：未覆盖完整批量操作、所有后台 UI 表单细节、对象存储上传、跨浏览器矩阵和 CI 数据库初始化；测试依赖可访问的本地或 Docker 服务，默认 `PLAYWRIGHT_BASE_URL=http://localhost:3000`。

### 已完成：Windows `.next-final` 文件锁问题

- 目标：解决本机 `npm run build` 失败。
- 涉及文件：`package.json`、`next.config.ts`、`Dockerfile`、`.gitignore`、`tsconfig.json`、`scripts/clean-build.js`、`README.md`、`docs/PROJECT_STATUS.md`。
- 验收条件：Windows 本机 `npm run build` 可执行；Docker build 继续通过。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run clean`、`npm run build`、`docker compose up -d --build app`、`git diff --check`。
- 结果：`.next-final` 来源确认是 `next.config.ts` 的 `distDir`；Docker 通过 `NEXT_DIST_DIR=.next-final` 继续使用该目录，本机默认使用 `.next-local-build`，避免历史 `.next-final` 文件锁阻断本机构建；新增跨平台 `npm run clean`，清理 `.next`、`.next-build`、`.next-final`、`.next-local-build`、`out`、`tsconfig.tsbuildinfo`，Windows 下可先隔离到 `.cleanup-stale/`，并在 EPERM/EBUSY/ENOTEMPTY 时输出中文文件锁排查提示。
- 验证结果：受限 shell 中普通权限 `npm run clean` 仍被旧构建目录 EPERM 阻止，普通权限 `npm run build` 出现 `spawn EPERM`；使用完整本机权限后 `npm run clean` 和 `npm run build` 均通过。Docker app 构建当前被 Docker Hub/npm 网络 EOF/ECONNRESET 阻塞，未进入项目编译错误。
- 风险：当前机器旧构建目录仍可能被外部进程或安全软件锁定；如果普通权限 clean 失败，需要关闭占用或使用完整本机权限。Docker 构建需网络恢复后重试。

### 已完成：Docker 空间安全清理脚本和文档

- 目标：增加安全查看和清理 Docker 占用的维护入口，避免误删数据库、证书或上传文件。
- 涉及文件：`AGENTS.md`、`README.md`、`package.json`、`docs/PROJECT_STATUS.md`、`docs/ARCHITECTURE.md`、`docs/DECISIONS.md`。
- 验收条件：能查看 Docker 空间占用；能安全清理构建缓存；不会自动删除 volume；不会删除数据库数据；README 或 docs 中说明如何手动判断 volume 是否可以删除。
- 已运行：`npm run lint`、`npx tsc --noEmit`、`npm run docker:df`、`git diff --check`。
- 结果：新增安全 npm scripts：`docker:df`、`docker:df:detail`、`docker:clean:build-cache`、`docker:clean:images`、`docker:clean:containers`；README 和 docs 已说明默认只清理构建缓存、dangling images、已停止临时容器，不自动清理 volume。
- 风险：Docker volume 可能保存 PostgreSQL 数据、Caddy 证书和用户上传文件，误删会造成数据丢失；本任务未新增任何 volume 清理脚本。

## P3：下一阶段候选任务

P3 任务仅为后续计划，本次不开发。开始任一项前仍需按 `AGENTS.md` 读取项目文档并只处理一项独立任务。

### 标签合并高级完善或验收

- 目标：在已完成的标签合并基础上补充更细的 UI 状态、批量选择或冲突提示验收。
- 验收条件：合并前后内容关联、重复关系跳过、操作日志和错误提示均有自动化覆盖。
- 风险：不要改动已通过的标签合并事务逻辑，除非测试暴露真实缺陷。

### 对象存储 Provider 接入

- 目标：接入 Cloudflare R2 / S3 兼容存储 Provider，复用现有 `StorageService` 适配层。
- 验收条件：本地上传仍可用；R2/S3 配置缺失时不会影响本地开发；上传、删除和 URL 生成均有测试。
- 风险：不能提交访问密钥、Token 或真实 bucket 配置；迁移已有上传文件前必须有备份方案。

### 更完整的 Playwright 覆盖

- 目标：扩展 E2E 到批量操作、用户收藏、搜索筛选、回收站永久删除和更多后台表单细节。
- 验收条件：测试数据继续使用 `E2E_TEST_` 前缀并只清理自身数据；失败截图和 trace 仍被忽略。
- 风险：测试不能依赖生产数据，不能清空数据库。

### CI 自动化测试

- 目标：在 CI 中运行 lint、TypeScript、smoke tests 和 Playwright E2E。
- 验收条件：CI 能初始化测试数据库、安装 Playwright 浏览器并上传失败报告。
- 风险：CI 密钥和测试账号必须通过安全变量注入。

### 数据库备份和恢复脚本

- 目标：补充 PostgreSQL 备份、恢复和演练文档。
- 验收条件：备份文件路径、恢复步骤、校验方式和失败处理清晰；恢复流程在非生产环境验证。
- 风险：恢复脚本不得误连生产库，不得覆盖未确认的数据。

### 网站内容运营功能

- 目标：完善公告、轮播图、站点设置等运营后台保存和前台读取能力。
- 验收条件：管理员可编辑，前台展示生效，权限和操作日志完整。
- 风险：缓存策略要避免修改后不生效。

### sitemap / robots / SEO 验收

- 目标：系统验收 sitemap、robots、metadata 和内容 SEO 字段前台使用。
- 验收条件：公开内容进入 sitemap，草稿/下架/软删除内容不暴露，详情页使用 SEO 标题和描述。
- 风险：不要让后台预览或私有内容被搜索引擎索引。

### 已完成：生产部署检查清单

- 目标：整理上线前检查项，包括环境变量、数据库迁移、Docker volume、备份、Caddy HTTPS、管理员账号和回滚。
- 验收条件：README 或 docs 中有可执行清单，并标明危险操作禁止项。
- 结果：已新增 `docs/PRODUCTION_CHECKLIST.md`，README 已链接该清单；清单覆盖生产环境变量、管理员账号、Docker volume 保护、上传持久化、Caddy HTTPS、迁移、备份恢复、日志、验收测试和回滚。
- 风险：部署文档不能包含密码、Token 或真实私密配置；正式上线前仍需人工确认 DNS、服务器端口、生产 `.env`、备份和 Docker 构建网络。

### 忘记密码和用户注销

- 目标：补完整账号生命周期。
- 涉及文件：`app/forgot-password/page.tsx`、`app/api/profile/route.ts`、新 reset API。
- 验收条件：可请求重置、使用令牌改密码、用户可注销。
- 需要运行：认证相关测试。
- 风险：邮件服务和令牌安全策略需要明确。

### 网站设置后台编辑

- 目标：允许管理员修改站点名称、描述、联系方式等。
- 涉及文件：`app/admin/settings/page.tsx`、新设置 API。
- 验收条件：设置保存到数据库，前台读取生效。
- 需要运行：设置 API 和页面验证。
- 风险：缓存策略要避免设置修改后不生效。
