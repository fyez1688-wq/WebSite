import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DEFAULT_PER_TAG = 1;
const MIN_CONTENT_LENGTH = 5_000;
const execute = process.argv.includes("--execute");
const perTagArg = process.argv.find((value) => value.startsWith("--per-tag="));
const perTag = Number(perTagArg?.slice("--per-tag=".length) || process.env.ARTICLES_PER_TAG || DEFAULT_PER_TAG);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type TagRecord = { id: string; name: string; slug: string };
type CategoryRecord = { id: string; name: string; isEnabled: boolean };
type Draft = { tag: TagRecord; index: number; title: string; slug: string; summary: string; content: string; categoryId: string };

function stableId(value: string) {
  let hash = 5381;
  for (const char of value) hash = (hash * 33) ^ char.codePointAt(0)!;
  return (hash >>> 0).toString(36);
}

function categoryNameForTag(tagName: string) {
  const name = tagName.toLowerCase();
  if (/(html|css|javascript|typescript|react|next|app router|hooks|dom|组件|布局|响应式|前端|可访问性|状态管理)/i.test(name)) return "前端开发";
  if (/(node|postgresql|prisma|sql|orm|api|route handler|服务端|数据库|权限认证|密码安全|全栈|缓存|异步|数据建模)/i.test(name)) return "后端与数据库";
  if (/(docker|caddy|cloudflare|r2|s3|tunnel|compose|dockerfile|git|github|https|反向代理|公网部署|运维|监控|容器|配置|版本控制)/i.test(name)) return "部署与运维";
  if (/(playwright|eslint|e2e|trace|断言|代码质量|代码规范|静态检查|调试|测试|构建|tsconfig)/i.test(name)) return "测试与质量";
  if (/(plc|codesys|lua|esp|iec|pwm|伺服|步进|自动化|运动控制|结构化文本|structured text|应用编程|物联网|plcopen|标准)/i.test(name)) return "自动化学习";
  return "技术文章";
}

function summaryFor(tag: string, title: string) {
  const summary = `本文以“${tag}”为主题，围绕${title}梳理从概念理解、边界识别到实践落地的完整思路。文章不把术语当作结论，而是说明它在真实项目中的输入、输出、协作关系与验证方法，并给出适合个人学习站读者复盘的检查清单。读者可以先建立可验证的小目标，再逐步扩展到工程规范、故障定位和长期维护，避免只记住命令或片段而无法独立解决问题。`;
  return summary.slice(0, 250);
}

function paragraph(tag: string, section: string, focus: string, step: string, risk: string) {
  return `在${section}中，${tag}不应被理解为孤立的名词，而应放在需求、实现、验证和维护的连续流程里观察。${focus}。学习时可以先把问题缩小为一个可重复的小场景，明确输入是什么、预期输出是什么、失败时有哪些可见信号，再用最少的配置完成第一次验证。${step}。这样做的价值不在于一次写出复杂方案，而在于让每一步都有证据可追踪：代码、配置、日志、页面状态或测试结果都能说明当前判断是否成立。遇到异常时，不要立刻叠加更多工具或参数，应先回到最近一次能够工作的状态，比较变化范围并记录假设。${risk}。当这些基础习惯稳定下来，${tag}才会从零散知识转化为可以迁移到新项目的工程能力。`;
}

function buildBody(tag: string, title: string) {
  const sections = [
    ["一、背景说明", "为什么需要先理解它解决的真实问题", "从一个最小学习任务开始，记录目标、约束和验收标准", "把环境差异、隐式依赖和未经验证的假设写入排查清单"],
    ["二、核心概念", "概念之间的职责边界、数据流和控制流", "为关键术语写出自己的定义，并用一个反例检验边界", "不要把相近概念混用，也不要只凭名称猜测行为"],
    ["三、实际应用场景", "它在个人项目、团队协作和线上运行中的不同表现", "选择一个贴近当前网站或工具链的场景完成端到端练习", "避免直接复制大型项目结构，应先确认需求规模和维护成本"],
    ["四、常见问题", "失败现象、根因和修复动作之间的对应关系", "先收集错误信息、复现步骤和最小输入，再决定修复方向", "不要把临时绕过当作长期方案，也不要忽略安全与兼容性"],
    ["五、学习路线", "从基础语法、官方资料到可交付练习的递进关系", "每完成一个阶段都补充笔记、示例和自测问题", "避免只收藏资料而不输出，也不要跳过前置概念"],
    ["六、实践建议", "命名、结构、测试和文档如何共同降低维护成本", "把重复操作沉淀为脚本或清单，并在小范围内先验证", "不要为了抽象而抽象，优先保留清晰且可回滚的实现"],
    ["七、避坑经验", "配置、版本、权限、网络和数据状态带来的隐蔽风险", "变更前确认影响范围，变更后通过日志和测试复核结果", "不要在不了解数据后果时运行清理或重置命令"],
    ["八、总结", "如何把单次练习沉淀为下一次可复用的判断框架", "用一页复盘记录有效做法、失败原因和待验证问题", "避免把草稿直接视为结论，发布前仍需人工审核和补充实例"]
  ] as const;

  const viewpoints = [
    "先建立全局图，再深入局部实现，可以减少在细节中迷失的概率",
    "把一次成功操作拆成可观察的步骤，才能在失败时准确定位断点",
    "优先阅读项目自身约束和官方文档，再决定是否引入额外工具",
    "用可重复的最小示例验证理解，远比只阅读结论更可靠",
    "将安全、性能和可维护性作为同一项设计的共同约束",
    "把用户可见体验与服务端真实状态同时纳入验收标准",
    "为异常路径预留清晰提示，避免系统看似成功却留下隐患",
    "在多人协作中明确输入、输出和责任边界，减少隐式依赖",
    "先保证正确性和可观测性，再考虑复杂优化",
    "定期回看旧笔记和旧实现，修正已经过时的判断"
  ];

  const body = [`# ${title}`, "", "> 本文为自动生成的学习草稿，仅用于后台人工审核、补充实例和后续发布准备。"];
  sections.forEach(([heading, focus, step, risk], sectionIndex) => {
    body.push("", `## ${heading}`, "");
    for (let paragraphIndex = 0; paragraphIndex < 4; paragraphIndex += 1) {
      const viewpoint = viewpoints[(sectionIndex * 3 + paragraphIndex) % viewpoints.length];
      body.push(paragraph(tag, heading, `${focus}；${viewpoint}`, `${step}；同时建议把观察结果写成可复查的学习记录`, `${risk}；必要时请回到官方文档和项目约束重新确认`), "");
    }
    body.push(`### ${tag} 自检问题`, "", `- 当前场景中，${tag}的输入、输出和失败信号分别是什么？`, `- 这次实现是否可以被一个最小示例、日志或自动化测试复现？`, `- 发布前还需要人工补充哪些项目上下文、版本信息或真实截图？`, "");
  });

  let content = body.join("\n");
  let supplement = 1;
  while (content.length < MIN_CONTENT_LENGTH) {
    const viewpoint = viewpoints[supplement % viewpoints.length];
    content += `\n\n### 延伸复盘 ${supplement}\n\n${paragraph(tag, "延伸复盘", `本轮重点是${viewpoint}`, "将结论转换为下一次可执行的检查步骤", "不要忽略与现有系统、真实数据和用户路径之间的差异")}`;
    supplement += 1;
  }
  return content;
}

function parsePerTag() {
  if (!Number.isInteger(perTag) || perTag < 1 || perTag > 10) throw new Error("--per-tag 必须是 1 到 10 的整数");
  return perTag;
}

async function main() {
  const requestedPerTag = parsePerTag();
  const [tags, categories, admin] = await Promise.all([
    prisma.tag.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true, isEnabled: true }, where: { isEnabled: true } }),
    prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true }, orderBy: { createdAt: "asc" } })
  ]);
  if (!admin) throw new Error("未找到可用管理员账号，无法写入草稿审计信息");
  if (!tags.length) throw new Error("当前没有标签，未生成任何草稿");

  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const fallbackCategory = categoryByName.get("技术文章") || categories[0];
  if (!fallbackCategory) throw new Error("未找到可用分类，无法关联文章草稿");

  const drafts: Draft[] = tags.flatMap((tag) => Array.from({ length: requestedPerTag }, (_, offset) => {
    const index = offset + 1;
    const title = `${tag.name} 学习实践：从概念到可验证交付（${index}）`;
    const preferredCategory = categoryByName.get(categoryNameForTag(tag.name)) || fallbackCategory;
    return {
      tag,
      index,
      title,
      slug: `tag-article-${stableId(`${tag.id}:${index}`)}`,
      summary: summaryFor(tag.name, title),
      content: buildBody(tag.name, title),
      categoryId: preferredCategory.id
    };
  }));

  const existing = await prisma.content.findMany({ where: { slug: { in: drafts.map((draft) => draft.slug) } }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const candidates = drafts.filter((draft) => !existingSlugs.has(draft.slug));
  const skipped = drafts.length - candidates.length;

  console.log(`标签数：${tags.length}`);
  console.log(`每个标签草稿数：${requestedPerTag}`);
  console.log(`预计草稿总数：${drafts.length}`);
  console.log(`将创建：${candidates.length}`);
  console.log(`跳过：${skipped}（同一稳定 slug 的已生成草稿）`);
  for (const tag of tags) {
    const planned = drafts.filter((draft) => draft.tag.id === tag.id);
    const createCount = planned.filter((draft) => !existingSlugs.has(draft.slug)).length;
    console.log(`- ${tag.name}：创建 ${createCount}，跳过 ${planned.length - createCount}`);
  }
  console.log(`模式：${execute ? "执行写入（仅 DRAFT）" : "dry-run（未写入）"}`);
  if (!execute) return;

  for (const draft of candidates) {
    await prisma.$transaction(async (tx) => {
      const created = await tx.content.create({
        data: {
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          content: draft.content,
          contentType: "ARTICLE",
          status: "DRAFT",
          allowFavorite: true,
          sortOrder: 0,
          seoTitle: draft.title,
          seoDescription: draft.summary,
          seoKeywords: draft.tag.name,
          categoryId: draft.categoryId,
          createdById: admin.id,
          updatedById: admin.id,
          tags: { create: [{ tagId: draft.tag.id }] }
        },
        select: { id: true, slug: true }
      });
      await tx.operationLog.create({
        data: {
          actorId: admin.id,
          action: "CREATE",
          target: "Content",
          targetId: created.id,
          targetTitle: draft.title,
          description: `按标签生成文章草稿：${draft.tag.name}`
        }
      });
    });
  }

  const createdSlugs = candidates.map((draft) => draft.slug);
  const verification = await prisma.content.findMany({
    where: { slug: { in: createdSlugs } },
    select: { slug: true, content: true, status: true, contentType: true, tags: { select: { tagId: true } } }
  });
  const expectedTagBySlug = new Map(candidates.map((draft) => [draft.slug, draft.tag.id]));
  const allDraft = verification.every((item) => item.status === "DRAFT");
  const allArticle = verification.every((item) => item.contentType === "ARTICLE");
  const allLongEnough = verification.every((item) => item.content.length >= MIN_CONTENT_LENGTH);
  const allCorrectlyTagged = verification.every((item) => item.tags.length === 1 && item.tags[0].tagId === expectedTagBySlug.get(item.slug));
  const allUnique = new Set(verification.map((item) => item.slug)).size === verification.length;

  console.log(`实际创建：${verification.length}`);
  console.log(`跳过：${skipped}`);
  console.log(`全部 DRAFT：${allDraft ? "是" : "否"}`);
  console.log(`全部 ARTICLE：${allArticle ? "是" : "否"}`);
  console.log(`全部正文不少于 ${MIN_CONTENT_LENGTH} 字符：${allLongEnough ? "是" : "否"}`);
  console.log(`slug 唯一：${allUnique ? "是" : "否"}`);
  console.log(`每篇仅关联对应标签：${allCorrectlyTagged ? "是" : "否"}`);
  if (![allDraft, allArticle, allLongEnough, allUnique, allCorrectlyTagged].every(Boolean)) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error);
  process.exit(1);
});
