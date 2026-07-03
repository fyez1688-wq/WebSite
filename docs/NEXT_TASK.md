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

## P2：功能增强

### 上传安全增强

- 目标：增加图片宽高检查、删除接口、对象存储适配层。
- 涉及文件：`services/storage.ts`、`app/api/admin/uploads/route.ts`。
- 验收条件：非图片、超大图片、伪装图片、普通用户上传均失败。
- 需要运行：上传 API 测试。
- 风险：Node 环境解析图片尺寸可能需要新增依赖。

### Playwright 测试

- 目标：覆盖登录、后台权限、创建草稿、发布、下架、上传、批量操作、回收站。
- 涉及文件：新增 `tests/` 或 `e2e/`。
- 验收条件：测试可在本地和 CI 执行，失败能定位问题。
- 需要运行：`npm run test:e2e` 或新增脚本。
- 风险：Docker 数据库状态需要可重复初始化，不能使用 `migrate reset` 破坏生产。

### Windows `.next-final` 文件锁问题

- 目标：解决本机 `npm run build` 失败。
- 涉及文件：`next.config.ts`、构建脚本、`.next-final` 清理策略。
- 验收条件：Windows 本机 `npm run build` 可执行；Docker build 继续通过。
- 需要运行：`npm run build`、`docker compose up -d --build app`。
- 风险：当前环境删除 `.next-final` 会 EPERM，可能需要重启终端/系统或改用新 distDir。

## P3：以后可以完成

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
