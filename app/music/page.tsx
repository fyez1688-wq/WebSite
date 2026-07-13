import type { Metadata } from "next";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { MusicCard } from "@/components/music/music-card";
import { MusicFilterForm } from "@/components/music/music-filter-form";
import { listPublicMusic } from "@/services/music";

export const metadata: Metadata = { title: "音乐小角落", description: "学习、阅读、编程时的背景音乐播放器" };
export const dynamic = "force-dynamic";

export default async function MusicPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.category) params.set("category", sp.category);
  if (sp.page) params.set("page", sp.page);
  const data = await listPublicMusic(params);

  return (
    <main className="container page-shell">
      <div className="page-heading">
        <p className="admin-kicker">背景音乐</p>
        <h1>音乐小角落</h1>
        <p className="muted">为学习、阅读和编程留一段不喧闹的背景声。点击播放按钮后才会开始播放。</p>
      </div>

      <MusicFilterForm categories={data.categories} initialCategory={sp.category} initialQuery={sp.q} />

      <div className="mt-7 flex items-center gap-2 text-sm muted"><Headphones className="size-4 text-[var(--primary)]" />共找到 {data.total} 首音乐</div>

      {data.items.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <MusicCard key={item.id} track={item} queue={data.items} />
          ))}
        </div>
      ) : (
        <div className="empty-state mt-5 p-10 text-center">
          <p className="font-medium">暂无匹配音乐</p>
          <p className="mt-2 muted">可以调整关键词或分类后重新筛选。</p>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-3">
        {data.page > 1 && (
          <Link className="btn" href={`/music?page=${data.page - 1}`}>
            上一页
          </Link>
        )}
        {data.total > data.page * data.pageSize && (
          <Link className="btn" href={`/music?page=${data.page + 1}`}>
            下一页
          </Link>
        )}
      </div>
    </main>
  );
}
