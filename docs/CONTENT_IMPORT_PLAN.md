# 学习资料导入计划

最后核验：2026-07-13

## 范围与导入规则

本文件是候选资料清单，不是导入脚本。本轮不会写入数据库、调用后台接口或创建内容。每个一级方向准备 10 条候选资料，共 50 条；来源优先为产品、语言、标准或开源项目的官方文档。

项目 `Content` 没有独立的 `sourceUrl` 字段。后续人工导入时，将本计划的 `sourceUrl` 填入 `resourceDetail.officialUrl`；`content` 只写原创导读、学习路径和来源说明，不复制来源正文。所有候选均使用 `contentType: LEARNING_RESOURCE`、`status: DRAFT`、`allowFavorite: true`、`isFeatured: false`、`isPinned: false`。

导入前必须逐条确认：建议分类和标签已在后台存在、链接仍可访问、内容许可和页面用途适合外链、摘要没有复制原文、slug 未与现有内容冲突。外链不是下载地址，因此 `resourceDetail.downloadUrl` 保持为空。

## 前端开发

```yaml
- title: MDN Web 开发教程总览
  slug: mdn-web-development-tutorials
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [HTML, CSS, JavaScript, 入门]
  summary: MDN 的学习入口覆盖搭建网页、语义化结构、样式和交互脚本，并按基础到进阶组织练习。适合作为前端学习的总导航，先完成网页基础模块，再按项目需求进入表单、布局、可访问性与性能主题。
  sourceUrl: https://developer.mozilla.org/en-US/docs/MDN/Tutorials
  difficulty: 入门
  reason: 浏览器厂商参与维护的开放 Web 文档，覆盖面完整且长期稳定。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 1000
- title: MDN HTML 内容结构入门
  slug: mdn-html-structuring-content
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [HTML, 语义化, 入门]
  summary: 该模块从文本、链接、图片、列表到表单讲解 HTML 如何表达内容结构。学习时应把重点放在语义标签、可访问性和文档层级，而不是只追求页面外观；完成后可用本站内容卡片练习结构设计。
  sourceUrl: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content
  difficulty: 入门
  reason: HTML 基础与可访问性学习的权威起点。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 990
- title: MDN CSS 基础教程
  slug: mdn-css-tutorials
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [CSS, 布局, 响应式]
  summary: MDN 将 CSS 教程按难度组织，适合从选择器、盒模型和层叠规则开始，再学习 Flexbox、Grid 与响应式布局。建议每完成一个概念就修改一个小组件，观察规则优先级和浏览器默认样式的实际影响。
  sourceUrl: https://developer.mozilla.org/en-US/docs/Web/CSS/Tutorials
  difficulty: 入门
  reason: 面向标准 CSS 的官方学习集合，避免依赖过时框架教程。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 980
- title: MDN 什么是 CSS
  slug: mdn-what-is-css
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [CSS, 盒模型, 入门]
  summary: 本文解释 CSS 语法、浏览器默认样式和规则如何应用到 HTML。它适合在正式学习布局前建立正确模型，尤其应理解结构与表现分离、层叠顺序和开发者工具对排查页面样式问题的重要性。
  sourceUrl: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS
  difficulty: 入门
  reason: 可作为 CSS 系列的第一篇短导读，便于快速建立概念。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 970
- title: MDN 什么是 JavaScript
  slug: mdn-what-is-javascript
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [JavaScript, DOM, 入门]
  summary: 该入门页说明 JavaScript 在网页中的角色，以及它与 HTML、CSS 的协作关系。建议先理解变量、函数、事件和 DOM 的边界，再开始复杂框架；学习过程中可以用浏览器控制台验证每个小例子。
  sourceUrl: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript
  difficulty: 入门
  reason: 官方基础导读，适合为 React 与 Node.js 学习建立前置知识。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 960
- title: TypeScript Handbook
  slug: typescript-handbook
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [TypeScript, 类型系统, 参考手册]
  summary: TypeScript Handbook 系统讲解日常类型、函数、对象、泛型与编译配置。建议已有 JavaScript 基础后按章节学习，并同步运行 tsc 观察报错；重点理解类型缩小与严格模式如何提前发现运行时问题。
  sourceUrl: https://www.typescriptlang.org/docs/handbook/intro.html
  difficulty: 进阶
  reason: TypeScript 官方主教程，与本站 TypeScript 技术栈直接相关。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 950
- title: TypeScript 在 JavaScript 项目中的渐进迁移
  slug: typescript-js-projects-gradual-adoption
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [TypeScript, JavaScript, JSDoc]
  summary: 本文介绍从 JavaScript、JSDoc 和 ts-check 逐步提升类型检查强度的方法。适合维护已有项目的开发者，不必一次性重写全部文件；可先为高风险模块增加检查，再逐步迁移到严格 TypeScript。
  sourceUrl: https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html
  difficulty: 实战
  reason: 解决真实项目渐进引入类型检查的常见需求。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 940
- title: React Learn 学习路径
  slug: react-learn-path
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [React, 组件, 状态管理]
  summary: React Learn 以组件、交互、状态管理和逃生舱为主线组织内容。建议按顺序完成组件与状态章节，再回看本站客户端组件，练习把页面拆分为职责明确、可复用且便于测试的 UI 单元。
  sourceUrl: https://react.dev/learn
  difficulty: 入门
  reason: React 官方自学课程，内容以现代函数组件和 Hooks 为主。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 930
- title: React API Reference 概览
  slug: react-api-reference-overview
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [React, Hooks, 参考手册]
  summary: React Reference 按 Hooks、组件和 API 提供可检索的技术说明。它不替代入门课程，适合在遇到 useEffect、表单控制或组件边界问题时查阅；学习时应优先理解使用场景和依赖关系，而非机械套用代码。
  sourceUrl: https://react.dev/reference/react
  difficulty: 参考手册
  reason: 官方 API 参考，适合作为 React 开发中的长期查询入口。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 920
- title: Next.js 官方文档
  slug: nextjs-official-docs
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 前端开发
  tags: [Next.js, App Router, 全栈]
  summary: Next.js 文档区分入门、指南和 API 参考，并明确 App Router 与 Pages Router 的边界。建议本站维护者优先阅读 App Router、路由、数据获取、缓存和部署相关章节，再结合现有 app 目录理解服务端与客户端组件协作。
  sourceUrl: https://nextjs.org/docs
  difficulty: 进阶
  reason: 与 FY 的小站框架完全一致，是后续维护的首选资料。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 910
```

## 后端与数据库

```yaml
- title: Node.js Learn 入门
  slug: nodejs-learn-introduction
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Node.js, 异步, 服务端]
  summary: Node.js Learn 解释 JavaScript 如何在浏览器外运行，以及非阻塞 I/O 对服务端并发的意义。建议先掌握事件循环、Promise 和错误处理，再阅读本站 Route Handler；不要把前端事件模型直接等同于服务端请求生命周期。
  sourceUrl: https://nodejs.org/learn
  difficulty: 入门
  reason: Node.js 官方学习入口，适合建立服务端运行时概念。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 900
- title: PostgreSQL 入门教程
  slug: postgresql-getting-started-tutorial
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [PostgreSQL, 数据库, SQL]
  summary: PostgreSQL 教程从安装、数据库创建和连接开始，适合先建立关系数据库的基本操作能力。学习时应在非生产环境练习建表和查询，并理解本站的 Prisma migration 是结构演进记录，不能用重置命令替代维护流程。
  sourceUrl: https://www.postgresql.org/docs/current/tutorial-start.html
  difficulty: 入门
  reason: PostgreSQL 官方教程，覆盖本站数据库的核心基础。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 890
- title: PostgreSQL SQL 语言参考
  slug: postgresql-sql-language
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [PostgreSQL, SQL, 参考手册]
  summary: 该部分从 SQL 语法、表定义、查询、数据类型到函数逐步展开。建议在已具备基础后用它核对复杂查询与索引概念，并把业务约束优先落实到 schema 和迁移中，避免只靠应用层约定保证数据正确性。
  sourceUrl: https://www.postgresql.org/docs/current/sql.html
  difficulty: 进阶
  reason: 官方 SQL 文档，适合作为 PostgreSQL 的长期参考。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 880
- title: Prisma Getting Started
  slug: prisma-getting-started
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Prisma, ORM, PostgreSQL]
  summary: Prisma 入门页梳理 schema、连接、Client 生成和查询的基本流程。建议结合本项目 prisma/schema.prisma 阅读，先理解模型和关系，再练习生成 Client 与查询；生产结构变更必须使用正式 migration，不直接修改数据库。
  sourceUrl: https://www.prisma.io/docs/getting-started
  difficulty: 入门
  reason: Prisma 官方起点，直接对应本站 ORM 工作流。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 870
- title: Prisma ORM 概览
  slug: prisma-orm-overview
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Prisma, ORM, 数据建模]
  summary: Prisma ORM 概览说明类型安全查询、schema、迁移与 Client 的职责边界。适合在学习 CRUD 之前理解 ORM 并不会取代数据库设计；遇到性能或复杂查询时仍应检查生成 SQL、索引和事务边界。
  sourceUrl: https://www.prisma.io/docs/orm
  difficulty: 进阶
  reason: 提供数据建模与类型安全访问的整体框架。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 860
- title: Prisma REST API Patterns
  slug: prisma-rest-api-patterns
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Prisma, REST API, Next.js]
  summary: 该指南展示在服务端控制器中使用 Prisma Client 处理公开读取与写入请求的常见模式。学习时应结合本站 services 层和 Route Handler，重点分离参数校验、权限检查、业务事务与响应格式，而不是把所有逻辑堆在接口文件中。
  sourceUrl: https://www.prisma.io/docs/orm/core-concepts/api-patterns
  difficulty: 实战
  reason: 官方 API 模式资料，适合连接 ORM 与实际接口设计。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 850
- title: Prisma CLI Reference
  slug: prisma-cli-reference
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Prisma, Migration, CLI]
  summary: Prisma CLI 参考覆盖 generate、validate、migrate、db 与 studio 等命令。建议把它作为命令查询页，并明确开发与生产命令边界：生产使用 migrate deploy，禁止用 migrate reset 处理已有数据环境。
  sourceUrl: https://docs.prisma.io/docs/cli
  difficulty: 参考手册
  reason: 避免误用数据库命令，是项目运维安全的重要资料。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 840
- title: OWASP API Security Top 10
  slug: owasp-api-security-top-10
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [API 安全, OWASP, 权限认证]
  summary: OWASP API Security Top 10 汇总对象级授权、认证、资源消耗与配置等常见风险。适合在新增后台接口前做检查清单，尤其要验证服务端会话、资源归属、输入限制和错误响应，不能只依赖前端隐藏按钮。
  sourceUrl: https://owasp.org/API-Security/editions/2019/en/dist/owasp-api-security-top-10.pdf
  difficulty: 进阶
  reason: 开放安全社区的权威风险分类，可指导接口审查。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 830
- title: OWASP Authentication Cheat Sheet
  slug: owasp-authentication-cheat-sheet
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [认证, 密码安全, OWASP]
  summary: 认证速查表用于复核密码策略、登录失败处理、会话安全与多因素认证等设计点。建议作为 NextAuth 和管理员账号维护时的安全参考；任何结论都应结合当前框架版本与项目实际威胁模型审查。
  sourceUrl: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  difficulty: 参考手册
  reason: OWASP Cheat Sheet Series 的长期维护安全资料。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 820
- title: Next.js Route Handlers 指南
  slug: nextjs-route-handlers-guide
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 后端与数据库
  tags: [Next.js, API 设计, Route Handler]
  summary: Route Handlers 指南说明 App Router 中 HTTP 请求与响应的组织方式。建议以本站 admin API 为例，练习将 Zod 校验、requireAdminApi、服务层调用和统一响应按顺序组织，并为写操作保留同源与权限防护。
  sourceUrl: https://nextjs.org/docs/app/getting-started/route-handlers
  difficulty: 实战
  reason: 与当前 Next.js App Router 后端实现直接对应。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 810
```

## 部署与运维

```yaml
- title: Docker Get Started
  slug: docker-get-started
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Docker, 容器, 入门]
  summary: Docker 入门路径从容器、镜像与基础命令开始，逐步引入构建和发布。建议先在无生产数据的环境完成练习，再理解本站 app、db、caddy 三个服务的职责；不要把删除容器、镜像和 volume 的风险混为一谈。
  sourceUrl: https://docs.docker.com/get-started/
  difficulty: 入门
  reason: Docker 官方学习入口，适合容器基础学习。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 800
- title: Docker 容器入门实验
  slug: docker-container-getting-started-lab
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Docker, Dockerfile, 实战]
  summary: 官方实验通过运行容器、编写 Dockerfile 和构建镜像讲解核心工作流。建议练习层缓存、端口和日志，但不要在 FY 的小站生产数据库卷上进行破坏性实验；可另建临时项目验证命令效果。
  sourceUrl: https://docs.docker.com/guides/lab-container-getting-started/
  difficulty: 实战
  reason: 官方动手实验，能把容器概念转化为实际操作。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 790
- title: Docker 构建与运行后续路径
  slug: docker-build-run-learning-path
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Docker, Compose, 缓存]
  summary: 该路径汇总镜像层、Dockerfile、多阶段构建、Compose、端口与持久化的后续主题。可用于解释本站 Dockerfile 的 deps、builder、runner 分层，以及为什么数据库、上传和证书 volume 需要保护和备份。
  sourceUrl: https://docs.docker.com/get-started/introduction/whats-next/
  difficulty: 进阶
  reason: 覆盖当前项目最常见的 Docker 维护知识点。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 780
- title: Caddy 官方文档
  slug: caddy-official-docs
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Caddy, HTTPS, 反向代理]
  summary: Caddy 文档用于查询 Caddyfile 指令、自动 HTTPS、反向代理和日志配置。建议先理解域名、上游服务与证书数据的关系，再修改生产配置；变更前应保留可回滚的配置版本，不直接试错公网域名。
  sourceUrl: https://caddyserver.com/docs/
  difficulty: 进阶
  reason: 当前站点反向代理的官方技术参考。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 770
- title: Caddy 安装与生产运行说明
  slug: caddy-install-production-guide
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Caddy, Docker, 运维]
  summary: 该说明覆盖官方安装方式、服务运行和 Docker 镜像入口。学习时应关注生产服务权限、配置文件和数据目录，而不是只复制安装命令；本站使用 Docker 时还需同时保护 Caddy 的证书与配置 volume。
  sourceUrl: https://caddyserver.com/docs/install
  difficulty: 实战
  reason: 官方生产安装指南，适合部署前核对。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 760
- title: Cloudflare Tunnel 设置指南
  slug: cloudflare-tunnel-setup
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Cloudflare Tunnel, cloudflared, 公网部署]
  summary: 本指南说明创建 Tunnel、连接 Connector，并将公网主机名映射到本地服务。建议对照 fy-site-tunnel 的健康状态学习，明确 Token 是机密且不能提交；正式部署使用受管理 Tunnel，不将临时 quick tunnel 当作生产方案。
  sourceUrl: https://developers.cloudflare.com/tunnel/setup/
  difficulty: 实战
  reason: 当前公网访问链路的官方配置文档。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 750
- title: Cloudflare Tunnel 配置参考
  slug: cloudflare-tunnel-configuration
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Cloudflare Tunnel, 监控, 配置]
  summary: Tunnel 配置参考集中说明日志、metrics、协议与源站连接参数。适合后续补充健康检查和日志观测时查阅；对源站 TLS 校验或 Host 头的调整应先在测试环境验证，避免为了临时连通性降低安全设置。
  sourceUrl: https://developers.cloudflare.com/tunnel/configuration/
  difficulty: 参考手册
  reason: 支持后续 Tunnel 运行状态监控与故障排查。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 740
- title: Cloudflare R2 S3 兼容 API
  slug: cloudflare-r2-s3-compatible-api
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Cloudflare R2, S3, 对象存储]
  summary: R2 的 S3 兼容文档说明 bucket、最小权限凭据、endpoint 和 AWS SDK 的使用方式。学习时应结合本站 Storage Provider，理解为什么密钥只放环境变量、上传 key 由服务端生成，以及删除范围必须限制在受控前缀。
  sourceUrl: https://developers.cloudflare.com/r2/get-started/s3/
  difficulty: 实战
  reason: FY 的小站已真实使用 R2，资料与现有实现直接匹配。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 730
- title: Pro Git 在线书籍
  slug: pro-git-online-book
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [Git, 版本控制, GitHub]
  summary: Pro Git 从版本控制基本概念、暂存、分支、远程仓库到协作流程完整展开。建议先掌握 status、diff、commit、pull 和 push，再学习分支与回滚；生产项目中应避免不理解后果地运行 hard reset 或 clean。
  sourceUrl: https://git-scm.com/book/en/v2
  difficulty: 入门
  reason: Git 官方网站维护的开放学习书籍，长期可用。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 720
- title: GitHub Docs 入门
  slug: github-docs-get-started
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 部署与运维
  tags: [GitHub, Git, 协作]
  summary: GitHub Docs 提供仓库、Issue、Pull Request、Actions 与安全设置等官方说明。建议先把代码、密钥和运行数据的边界分清：代码进入仓库，.env、数据库 dump、上传文件和访问令牌不进入版本控制。
  sourceUrl: https://docs.github.com/en/get-started
  difficulty: 入门
  reason: GitHub 官方协作入口，适合补齐 Git 远程协作知识。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 710
```

## 测试与质量

```yaml
- title: Playwright 安装与入门
  slug: playwright-introduction
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [Playwright, E2E, 自动化测试]
  summary: Playwright 官方入门说明测试运行器、断言、浏览器安装和报告。建议先运行本站已有 E2E，再为一个稳定流程增加断言；不要把浏览器缺失或外部网络失败误判为业务功能失败，应保留真实错误信息。
  sourceUrl: https://playwright.dev/docs/intro
  difficulty: 入门
  reason: 项目已有 Playwright 配置与测试，是最直接的学习入口。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 700
- title: Playwright 编写测试指南
  slug: playwright-writing-tests
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [Playwright, E2E, 断言]
  summary: 编写测试指南讲解测试文件、页面交互、断言与隔离原则。建议优先覆盖管理员权限、上传安全和内容发布等高风险链路，使用可读的角色定位器和可重复的测试数据，不把脆弱的 CSS 细节当作唯一断言。
  sourceUrl: https://playwright.dev/docs/writing-tests
  difficulty: 实战
  reason: 可直接指导本站 E2E 用例扩展。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 690
- title: Playwright Locator 指南
  slug: playwright-locators
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [Playwright, 可访问性, Locator]
  summary: Locator 指南说明如何使用 role、label、text 等稳定语义定位页面元素。建议在新增交互组件时补好 aria-label，再选择定位器；这样测试更接近用户使用方式，也能减少因样式调整导致的无意义测试失败。
  sourceUrl: https://playwright.dev/docs/locators
  difficulty: 进阶
  reason: 对提升 E2E 稳定性和无障碍基础都有帮助。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 680
- title: Playwright Trace Viewer
  slug: playwright-trace-viewer
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [Playwright, 调试, Trace]
  summary: Trace Viewer 用时间线、网络、DOM 快照和操作记录辅助定位 E2E 失败。建议只在失败排查时查看生成报告，并保持 playwright-report 与 test-results 被 Git 忽略；不要把含潜在测试数据的运行产物提交到仓库。
  sourceUrl: https://playwright.dev/docs/trace-viewer
  difficulty: 实战
  reason: 项目已产生 trace 目录，适合建立正确的排查流程。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 670
- title: ESLint Getting Started
  slug: eslint-getting-started
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [ESLint, 静态检查, JavaScript]
  summary: ESLint 入门介绍配置、规则和命令行检查的作用。建议把 lint 视为提交前的基础质量门槛，而不是自动修复一切的工具；新增忽略规则时只排除生成目录，不能借此隐藏真实业务代码问题。
  sourceUrl: https://eslint.org/docs/latest/use/getting-started
  difficulty: 入门
  reason: 当前项目已使用 eslint.config.mjs，资料可直接对应。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 660
- title: ESLint 官方文档
  slug: eslint-official-documentation
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [ESLint, 配置, 参考手册]
  summary: ESLint 文档提供规则、配置和插件机制的完整索引。适合遇到 lint 报错或 Flat Config 配置疑问时查阅；修改规则前应确认问题是代码缺陷、生成文件误扫还是团队风格约束，避免盲目关闭规则。
  sourceUrl: https://eslint.org/docs/latest/
  difficulty: 参考手册
  reason: 官方参考可用于维护现有 ESLint 配置。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 650
- title: TypeScript 文档入口
  slug: typescript-documentation-index
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [TypeScript, 类型检查, TSConfig]
  summary: TypeScript 文档入口汇集 Handbook、TSConfig、CLI 和迁移教程。建议先使用 npx tsc --noEmit 固定检查当前项目，再根据实际错误学习对应类型概念；类型检查应与运行时 Zod 校验互补，不能互相替代。
  sourceUrl: https://www.typescriptlang.org/docs/
  difficulty: 入门
  reason: 官方总索引，便于从报错反查正确主题。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 640
- title: TypeScript Project References
  slug: typescript-project-references
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [TypeScript, 构建, 项目配置]
  summary: Project References 讲解大型 TypeScript 项目如何拆分、增量构建和组织依赖。当前单体项目不必立即引入它，但在将来拆分共享包、后台和前台模块前，应先理解 composite、声明输出与 build 模式带来的约束。
  sourceUrl: https://www.typescriptlang.org/docs/handbook/project-references
  difficulty: 进阶
  reason: 为后续规模化构建与类型检查提供可靠参考。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 630
- title: TypeScript Modules Reference
  slug: typescript-modules-reference
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [TypeScript, 模块, Node.js]
  summary: 模块参考解释 ESM、CommonJS、解析策略和 package.json imports/exports 的影响。适合在排查构建环境、路径别名或运行时导入差异时查阅；要同时验证 TypeScript、Node.js 与 Next.js 对模块配置的实际兼容性。
  sourceUrl: https://www.typescriptlang.org/docs/handbook/modules/reference
  difficulty: 参考手册
  reason: 处理构建与模块解析问题时的官方依据。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 620
- title: TypeScript Handbook 类型系统复习
  slug: typescript-handbook-type-checking-review
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 测试与质量
  tags: [TypeScript, 类型系统, 代码质量]
  summary: Handbook 可作为类型系统的系统复习资料，重点关注对象、函数、泛型、联合类型和控制流分析。建议把一次真实 tsc 报错缩小为最小示例后再查阅，避免为了让编译通过而滥用 any 或类型断言。
  sourceUrl: https://www.typescriptlang.org/docs/handbook/intro.html
  difficulty: 进阶
  reason: 类型质量的核心官方教程，适合长期回看。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 610
```

## 自动化学习

```yaml
- title: PLCopen IEC 61131-3 编程语言概览
  slug: plcopen-iec-61131-3-overview
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [PLC, IEC 61131-3, 自动化]
  summary: PLCopen 概览介绍 IEC 61131-3 的 ST、LD、FBD 与 SFC 等语言和组织方式。建议先理解扫描周期、输入输出和程序组织单元，再选择语言练习；工业控制逻辑应先在仿真或安全条件下验证，不能直接上设备试错。
  sourceUrl: https://plcopen.org/iec-61131-3
  difficulty: 入门
  reason: 自动化编程语言标准的官方介绍，跨平台适用。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 600
- title: PLCopen Standards 标准导航
  slug: plcopen-standards-navigation
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [PLC, PLCopen, 标准]
  summary: PLCopen 标准导航说明 IEC 61131 及其扩展规范在工业自动化中的位置。适合建立标准、厂商实现和项目代码之间的边界认识；实际工程仍要以所用控制器、驱动器和安全规范的正式手册为准。
  sourceUrl: https://www.plcopen.org/standards/
  difficulty: 参考手册
  reason: 有助于避免只学习单一厂商方言而忽略通用标准。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 590
- title: PLCopen Coding Guidelines
  slug: plcopen-coding-guidelines
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [PLC, 代码规范, 工程实践]
  summary: PLCopen 编码指南可用于学习命名、结构、可读性和可维护性的工程约束。建议把它作为团队规范制定参考，而非机械照搬；对安全互锁、急停和现场调试仍需遵循设备风险评估与所在行业法规。
  sourceUrl: https://www.plcopen.org/system/files/downloads/plcopen_coding_guidelines_version_1.0.pdf
  difficulty: 进阶
  reason: 开放标准组织发布的工程编码实践资料。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 580
- title: PLCopen Motion Control 资料入口
  slug: plcopen-motion-control-resources
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [运动控制, PLCopen, 伺服]
  summary: PLCopen 下载区提供 Motion Control 规范和应用资料入口，可用于了解轴、运动功能块和状态机的通用术语。它适合建立概念模型；伺服参数、限位、速度和加速度必须以具体驱动器手册与现场安全要求为准。
  sourceUrl: https://plcopen.org/downloads
  difficulty: 进阶
  reason: 覆盖运动控制标准资料，避免引用无来源的设备调参经验。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 570
- title: CODESYS 应用编程说明
  slug: codesys-application-programming
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [CODESYS, PLC, 应用编程]
  summary: CODESYS Online Help 介绍应用、POU、编辑器、调试与下载到控制器的基本流程。建议先在仿真或断开执行机构的环境练习变量监视和程序组织，再接触真实硬件；下载前必须确认目标设备和项目版本。
  sourceUrl: https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_struct_application_programming.html
  difficulty: 入门
  reason: CODESYS 官方在线帮助，适合学习开发环境的实际工作流。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 560
- title: CODESYS Online Help 文档入口
  slug: codesys-online-help
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [CODESYS, Structured Text, 参考手册]
  summary: CODESYS Online Help 是查询语言、库、设备配置与在线调试细节的官方入口。建议遇到某个功能时查对应版本帮助，并记录目标 runtime 与库版本；不要以搜索结果片段替代完整上下文，更不要在生产设备直接试验未理解的功能。
  sourceUrl: https://content.helpme-codesys.com/en/
  difficulty: 参考手册
  reason: CODESYS 工程细节以该官方帮助为准。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 550
- title: Lua 5.4 Reference Manual
  slug: lua-54-reference-manual
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [Lua, 脚本语言, 参考手册]
  summary: Lua 5.4 手册定义语言的值、类型、函数、表、协程和标准库行为。建议先完成基础语法练习，再将它用于设备脚本或工具自动化；涉及现场动作的脚本要加入输入校验、异常处理和可追踪日志。
  sourceUrl: https://www.lua.org/manual/5.4/
  difficulty: 参考手册
  reason: Lua 官方语言定义，适合准确查询语义。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 540
- title: Lua 5.4 安装与概览
  slug: lua-54-readme
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [Lua, 入门, 开源]
  summary: Lua 官方 readme 介绍语言定位、源码发行和基础安装信息。适合刚接触 Lua 的学习者建立轻量嵌入式脚本语言的概念，再转入参考手册学习；不同宿主软件可能嵌入不同 Lua 版本，需先核对版本兼容性。
  sourceUrl: https://www.lua.org/manual/5.4/readme.html
  difficulty: 入门
  reason: 官方简短起点，适合与完整参考手册配套收录。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 530
- title: ESP-IDF ESP32 Get Started
  slug: esp-idf-esp32-get-started
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [ESP32, ESP-IDF, 物联网]
  summary: ESP-IDF 入门覆盖环境安装、首个项目、编译、烧录和串口监视。建议从官方开发板和示例工程开始，并先掌握供电、串口和固件日志基础；连接真实传感器或执行器前，应断电检查电平、接线和额定电流。
  sourceUrl: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/
  difficulty: 入门
  reason: Espressif 官方框架起点，适合 ESP32 正规开发流程。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 520
- title: ESP-IDF MCPWM 外设参考
  slug: esp-idf-mcpwm-peripheral-reference
  contentType: LEARNING_RESOURCE
  status: DRAFT
  category: 自动化学习
  tags: [ESP32, 伺服, 步进电机, PWM]
  summary: MCPWM 文档用于理解 ESP32 的 PWM、定时器和电机控制相关外设能力，可作为伺服与步进控制的代码层参考。它不替代电机驱动、电源和机械限位设计；真实运动系统必须增加急停、限位和独立硬件保护。
  sourceUrl: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/mcpwm.html
  difficulty: 进阶
  reason: 官方外设资料，适合从软件角度建立运动控制基础。
  copyrightNote: 只收录标题、原创摘要、学习建议和来源链接，不复制原文。
  sortOrder: 510
```

## 后续人工导入顺序

1. 后台确认五个建议分类和所列标签是否存在；只复用已有分类/标签或先由管理员手工创建。
2. 每次最多导入 3 到 5 条草稿，确认 slug、摘要、外链和封面策略；不批量发布。
3. 将 `sourceUrl` 映射到 `resourceDetail.officialUrl`，正文写原创导读并声明“请在来源页阅读完整内容”。
4. 先在管理员预览核对 Markdown、外链和 SEO 字段，再单独审核并发布。
5. 对自动化、电机、伺服和步进类资料增加安全提示；不收录可直接驱动真实设备的无边界参数表或未经验证的接线方案。
