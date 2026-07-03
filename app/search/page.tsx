import type { Metadata } from "next";
import { ContentCard } from "@/components/content-card";
import { getContentList } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "搜索" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  if (q) {
    await prisma.searchTerm.upsert({
      where: { keyword: q },
      create: { keyword: q },
      update: { count: { increment: 1 } }
    });
  }
  const [data, hotTerms] = await Promise.all([
    getContentList({ query: q, category: sp.category, tag: sp.tag, order: "featured" }),
    prisma.searchTerm.findMany({ orderBy: { count: "desc" }, take: 8 })
  ]);
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-semibold">搜索</h1>
      <form className="mt-5 flex gap-3">
        <input className="input" name="q" defaultValue={q} placeholder="输入标题或简介关键词" />
        <button className="btn btn-primary">搜索</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {hotTerms.map((term) => (
          <a className="btn" key={term.id} href={`/search?q=${encodeURIComponent(term.keyword)}`}>
            {term.keyword}
          </a>
        ))}
      </div>
      <p className="mt-4 muted">搜索结果 {data.total} 条</p>
      {data.items.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="card mt-4 p-10 text-center muted">没有找到相关内容</div>
      )}
    </main>
  );
}
