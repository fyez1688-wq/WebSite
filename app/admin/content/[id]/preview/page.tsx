import { notFound } from "next/navigation";
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
  return (
    <main className="container py-8">
      <div className="mb-4 status-pill">管理员预览，不增加浏览量</div>
      <article className="card p-6 md:p-8">
        <div className="flex flex-wrap gap-2 text-sm muted">
          <span>{content.category?.name || "未分类"}</span>
          <span>{content.status}</span>
          <span>{content.contentType}</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold">{content.title}</h1>
        <p className="mt-3 text-lg muted">{content.summary}</p>
        <div className="prose-content mt-8 whitespace-pre-wrap">{content.content}</div>
      </article>
    </main>
  );
}
