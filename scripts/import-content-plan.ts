import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PlanItem = { title: string; slug: string; category: string; tags: string[]; summary: string; sourceUrl: string; difficulty: string; reason: string; copyrightNote: string; sortOrder: number };

const execute = process.argv.includes("--execute");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function stableSlug(prefix: string, value: string) {
  let hash = 5381;
  for (const char of value) hash = (hash * 33) ^ char.codePointAt(0)!;
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function parsePlan(): PlanItem[] {
  const markdown = readFileSync(process.env.CONTENT_IMPORT_PLAN_PATH || "docs/CONTENT_IMPORT_PLAN.md", "utf8");
  const blocks = [...markdown.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  return blocks.flatMap((block) => block.trim().split(/(?=^- title: )/m).filter((entry) => entry.startsWith("- title: ")).map((entry) => {
    const values: Record<string, string> = {};
    for (const line of entry.split(/\r?\n/)) {
      const match = line.match(/^(?:- |  )([A-Za-z]+):\s*(.*)$/);
      if (match) values[match[1]] = match[2].trim();
    }
    const required = ["title", "slug", "category", "summary", "sourceUrl", "difficulty", "reason", "copyrightNote", "sortOrder"];
    for (const key of required) if (!values[key]) throw new Error(`导入计划缺少 ${key}`);
    return { ...values, tags: (values.tags || "[]").slice(1, -1).split(",").map((tag) => tag.trim()).filter(Boolean), sortOrder: Number(values.sortOrder) } as PlanItem;
  }));
}

function body(item: PlanItem) {
  return `## 学习说明\n\n${item.summary}\n\n## 学习建议\n\n${item.reason}\n\n难度：${item.difficulty}\n\n## 来源与版权\n\n${item.copyrightNote}\n\n来源链接：${item.sourceUrl}`;
}

async function main() {
  const items = parsePlan();
  if (items.length !== 50) throw new Error(`计划条目数量异常：预期 50，实际 ${items.length}`);
  const slugs = items.map((item) => item.slug);
  const urls = items.map((item) => item.sourceUrl);
  const [existingSlugs, existingUrls] = await Promise.all([
    prisma.content.findMany({ where: { slug: { in: slugs } }, select: { slug: true } }),
    prisma.contentResourceDetail.findMany({ where: { officialUrl: { in: urls } }, select: { officialUrl: true } })
  ]);
  const slugSet = new Set(existingSlugs.map((item) => item.slug));
  const urlSet = new Set(existingUrls.map((item) => item.officialUrl).filter(Boolean));
  const candidates = items.filter((item) => !slugSet.has(item.slug) && !urlSet.has(item.sourceUrl));
  console.log(`计划：${items.length} 条；将创建：${candidates.length} 条；因 slug 或 officialUrl 重复跳过：${items.length - candidates.length} 条。`);
  console.log(`模式：${execute ? "执行写入（全部 DRAFT）" : "dry-run（未写入）"}`);
  if (!execute) return;

  for (const item of candidates) {
    const category = await prisma.category.findFirst({ where: { name: item.category } }) ?? await prisma.category.create({ data: { name: item.category, slug: stableSlug("plan-category", item.category), description: "资料导入计划分类" } });
    const tagIds = [] as string[];
    for (const name of item.tags) {
      const tag = await prisma.tag.findFirst({ where: { name } }) ?? await prisma.tag.create({ data: { name, slug: stableSlug("plan-tag", name) } });
      tagIds.push(tag.id);
    }
    await prisma.content.create({ data: { title: item.title, slug: item.slug, summary: item.summary, content: body(item), contentType: "LEARNING_RESOURCE", status: "DRAFT", categoryId: category.id, sortOrder: item.sortOrder, allowFavorite: true, resourceDetail: { create: { officialUrl: item.sourceUrl, installGuide: `难度：${item.difficulty}\n收录理由：${item.reason}` } }, tags: { create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) } } });
  }
  console.log(`已创建 ${candidates.length} 条草稿；未发布、未更新或删除任何既有内容。`);
}

main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exit(1); });
