import type { Metadata } from "next";
import Link from "next/link";
import { MusicCard } from "@/components/music/music-card";
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
    <main className="container py-8">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="admin-kicker">背景音乐</p>
          <h1 className="text-3xl font-semibold">音乐小角落</h1>
          <p className="mt-2 max-w-2xl muted">只收录管理员确认有权使用、公开授权或允许外链播放的音频资源。</p>
        </div>
      </div>

      <form className="card mt-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="input" name="q" defaultValue={sp.q} placeholder="搜索歌曲名、作者或专辑" />
        <select className="input" name="category" defaultValue={sp.category || ""}>
          <option value="">全部分类</option>
          {data.categories.map((category) => (
            <option key={category} value={category || ""}>
              {category}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">筛选</button>
      </form>

      <p className="mt-4 text-sm muted">共找到 {data.total} 首音乐，点击播放按钮后才会开始播放。</p>

      {data.items.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <MusicCard key={item.id} track={item} queue={data.items} />
          ))}
        </div>
      ) : (
        <div className="card mt-4 p-10 text-center">
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
