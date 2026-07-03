import { notFound } from "next/navigation";
import Link from "next/link";
import { MarkdownPreview } from "@/components/markdown-preview";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function AdminContentPreviewPage({ params }: Props) {
  const { id } = await params;
  const content = await prisma.content.findUnique({
    where: { id },
    include: { category: true, tags: { include: { tag: true } }, resourceDetail: true }
  });
  if (!content || content.deletedAt) notFound();
  const statusText: Record<string, string> = {
    DRAFT: "草稿",
    PUBLISHED: "已发布",
    OFFLINE: "已下架",
    HIDDEN: "已隐藏"
  };
  return (
    <main className="container py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="status-pill">管理员预览，不增加浏览量</span>
          <span className="status-pill">{statusText[content.status] || content.status}</span>
        </div>
        <Link className="btn" href={`/admin/content/${content.id}/edit`}>返回编辑</Link>
      </div>
      <article className="card p-6 md:p-8">
        <div className="flex flex-wrap gap-2 text-sm muted">
          <span>{content.category?.name || "未分类"}</span>
          <span>{content.contentType}</span>
          {content.publishedAt && <span>发布于 {content.publishedAt.toLocaleDateString("zh-CN")}</span>}
          <span>更新于 {content.updatedAt.toLocaleDateString("zh-CN")}</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold">{content.title}</h1>
        <p className="mt-3 text-lg muted">{content.summary}</p>
        {!!content.tags.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {content.tags.map(({ tag }) => (
              <span key={tag.id} className="status-pill">{tag.name}</span>
            ))}
          </div>
        )}
        <MarkdownPreview value={content.content} className="mt-8" />
      </article>
    </main>
  );
}
