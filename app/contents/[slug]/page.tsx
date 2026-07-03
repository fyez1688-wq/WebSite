import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ContentCard } from "@/components/content-card";
import { MarkdownPreview } from "@/components/markdown-preview";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await prisma.content.findFirst({ where: { slug, status: "PUBLISHED", isHidden: false, deletedAt: null } });
  if (!item) return { title: "内容不存在" };
  return { title: item.title, description: item.summary, alternates: { canonical: `/contents/${slug}` } };
}

export default async function ContentDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await prisma.content.findFirst({
    where: { slug, status: "PUBLISHED", isHidden: false, deletedAt: null },
    include: { category: true, tags: { include: { tag: true } } }
  });
  if (!item) notFound();

  await prisma.content.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } });

  const [related, prev, next] = await Promise.all([
    prisma.content.findMany({
      where: {
        id: { not: item.id },
        status: "PUBLISHED",
        isHidden: false,
        deletedAt: null,
        categoryId: item.categoryId
      },
      include: { category: true, tags: { include: { tag: true } } },
      take: 3
    }),
    prisma.content.findFirst({
      where: { status: "PUBLISHED", isHidden: false, deletedAt: null, publishedAt: { lt: item.publishedAt || item.createdAt } },
      orderBy: { publishedAt: "desc" }
    }),
    prisma.content.findFirst({
      where: { status: "PUBLISHED", isHidden: false, deletedAt: null, publishedAt: { gt: item.publishedAt || item.createdAt } },
      orderBy: { publishedAt: "asc" }
    })
  ]);

  return (
    <main className="container py-8">
      <article className="card p-5 md:p-8">
        <div className="flex flex-wrap gap-2 text-sm muted">
          {item.category && <span>{item.category.name}</span>}
          <span>{item.viewCount + 1} 浏览</span>
          <span>{item.favoriteCount} 收藏</span>
          {item.publishedAt && <span>发布于 {item.publishedAt.toLocaleDateString("zh-CN")}</span>}
          <span>更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{item.title}</h1>
        <p className="mt-3 text-lg muted">{item.summary}</p>
        {!!item.tags.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map(({ tag }) => (
              <span key={tag.id} className="status-pill">{tag.name}</span>
            ))}
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <FavoriteButton contentId={item.id} />
          <CopyLinkButton />
        </div>
        <MarkdownPreview value={item.content} className="mt-8" />
      </article>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="card p-4">上一篇：{prev ? <a href={`/contents/${prev.slug}`}>{prev.title}</a> : "没有了"}</div>
        <div className="card p-4">下一篇：{next ? <a href={`/contents/${next.slug}`}>{next.title}</a> : "没有了"}</div>
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">相关推荐</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((content) => (
            <ContentCard key={content.id} item={content} />
          ))}
        </div>
      </section>
    </main>
  );
}
