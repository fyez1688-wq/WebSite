import type { Metadata } from "next";
import Link from "next/link";
import { Filter, FolderOpen, Search } from "lucide-react";
import { ContentCard } from "@/components/content-card";
import { getContentList } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "内容列表", description: "浏览 FY的小站公开内容" };
export const dynamic = "force-dynamic";

export default async function ContentsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [data, categories, tags] = await Promise.all([
    getContentList({
      query: sp.q,
      category: sp.category,
      tag: sp.tag,
      order: sp.order,
      page: Number(sp.page || 1)
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <main className="container page-shell">
      <div className="page-heading">
        <p className="admin-kicker">内容浏览</p>
        <h1>把有用的信息，留在随时能找到的地方。</h1>
        <p className="muted">按关键词、分类和标签筛选，快速回到你需要的学习资源与技术记录。</p>
      </div>
      <form className="filter-panel mt-7 grid gap-3 p-4 md:grid-cols-4 md:p-5">
        <label className="relative"><Search className="absolute left-3 top-3 size-4 muted" /><input className="input pl-9" name="q" defaultValue={sp.q} placeholder="关键词搜索" /></label>
        <select className="input" name="category" defaultValue={sp.category || ""}>
          <option value="">全部分类</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="input" name="tag" defaultValue={sp.tag || ""}>
          <option value="">全部标签</option>
          {tags.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="input" name="order" defaultValue={sp.order || "latest"}>
          <option value="latest">最新排序</option>
          <option value="hot">最热排序</option>
          <option value="featured">推荐优先</option>
        </select>
        <button className="btn btn-primary md:col-span-4"><Filter className="size-4" />筛选内容</button>
      </form>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><p className="font-medium">共找到 {data.total} 条内容</p><span className="inline-flex items-center gap-2 text-sm muted"><FolderOpen className="size-4" />{categories.length} 个分类</span></div>
      {data.items.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state mt-5 p-10 text-center">
          <p className="font-medium">暂无匹配内容</p>
          <p className="mt-2 muted">可以调整关键词、分类或标签后重新筛选。</p>
        </div>
      )}
      <div className="mt-6 flex justify-center gap-3">
        {data.page > 1 && <Link className="btn" href={`/contents?page=${data.page - 1}`}>上一页</Link>}
        {data.total > data.page * data.pageSize && (
          <Link className="btn" href={`/contents?page=${data.page + 1}`}>下一页</Link>
        )}
      </div>
    </main>
  );
}
