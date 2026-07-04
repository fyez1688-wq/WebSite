import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ContentCard } from "@/components/content-card";
import { MusicCard } from "@/components/music/music-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [banners, categories, announcements, featured, latest, hot, favoriteCount, music] =
    await prisma.$transaction([
      prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.announcement.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.content.findMany({
        where: { status: "PUBLISHED", isFeatured: true, isHidden: false, deletedAt: null },
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: 6
      }),
      prisma.content.findMany({
        where: { status: "PUBLISHED", isHidden: false, deletedAt: null },
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: { publishedAt: "desc" },
        take: 6
      }),
      prisma.content.findMany({
        where: { status: "PUBLISHED", isHidden: false, deletedAt: null },
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: [{ viewCount: "desc" }, { favoriteCount: "desc" }],
        take: 6
      }),
      prisma.favorite.count(),
      prisma.musicTrack.findMany({
        where: { isPublished: true, isFeatured: true, deletedAt: null },
        select: {
          id: true,
          title: true,
          artist: true,
          album: true,
          description: true,
          coverImage: true,
          audioUrl: true,
          sourceUrl: true,
          license: true,
          category: true,
          duration: true,
          sortOrder: true,
          isFeatured: true,
          playCount: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 6
      })
    ]);
  const hero = banners[0];

  return (
    <main>
      <section className="hero-stage">
        <Image
          src={hero?.imageUrl || "/images/hero.svg"}
          alt={hero?.title || "FY的小站"}
          fill
          priority
          className="object-cover"
        />
        <div className="container hero-copy">
          <p className="mb-3 text-sm font-semibold text-amber-200">资源收藏 · 学习资料 · 技术文章 · 软件下载</p>
          <h1>{hero?.title || "FY的小站"}</h1>
          <p className="mt-5 text-lg text-white/86 md:text-xl">
            {hero?.subtitle || "把常用资源、学习路线和技术资料集中整理，方便快速查找、收藏和持续更新。"}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/contents" className="btn btn-primary">
              浏览内容
            </Link>
            <Link href="/search" className="btn bg-white/92 text-slate-950">
              搜索资源
            </Link>
          </div>
        </div>
      </section>

      <section className="container -mt-14 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="stat-strip relative z-10">
          <div>
            <p className="muted">公开内容</p>
            <p className="mt-2 text-3xl font-semibold">{latest.length + featured.length + hot.length}</p>
          </div>
          <div>
            <p className="muted">分类数量</p>
            <p className="mt-2 text-3xl font-semibold">{categories.length}</p>
          </div>
          <div>
            <p className="muted">收藏次数</p>
            <p className="mt-2 text-3xl font-semibold">{favoriteCount}</p>
          </div>
        </div>
        <aside className="card relative z-10 p-5">
          <h2 className="font-semibold">网站公告</h2>
          <div className="mt-3 grid gap-3">
            {announcements.length ? (
              announcements.map((item) => (
                <div key={item.id} className="border-b border-[var(--border)] pb-3 last:border-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm muted">{item.content}</p>
                </div>
              ))
            ) : (
              <p className="muted">暂无公告</p>
            )}
          </div>
        </aside>
      </section>

      <section className="container section-band">
        <h2 className="mb-4 text-xl font-semibold">分类导航</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((item) => (
            <Link key={item.id} href={`/contents?category=${item.slug}`} className="card p-4">
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm muted">{item.description || "查看该分类内容"}</p>
            </Link>
          ))}
        </div>
      </section>

      <HomeBlock title="推荐内容" items={featured} />
      <section className="container py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">听歌放松</h2>
            <p className="mt-1 text-sm muted">学习、阅读、写代码时的背景音乐。</p>
          </div>
          <Link href="/music" className="muted">
            更多
          </Link>
        </div>
        {music.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {music.map((item) => (
              <MusicCard key={item.id} track={item} queue={music} compact />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center muted">暂无推荐音乐</div>
        )}
      </section>
      <HomeBlock title="最新内容" items={latest} />
      <HomeBlock title="热门内容" items={hot} />
      <Footer />
    </main>
  );
}

function HomeBlock({ title, items }: { title: string; items: Parameters<typeof ContentCard>[0]["item"][] }) {
  return (
    <section className="container py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href="/contents" className="muted">
          查看更多
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center muted">暂无内容</div>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-[var(--border)] py-8">
      <div className="container flex flex-col justify-between gap-3 text-sm muted md:flex-row">
        <p>© {new Date().getFullYear()} FY的小站</p>
        <div className="flex gap-4">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">用户协议</Link>
          <a href="mailto:admin@example.com">联系方式</a>
        </div>
      </div>
    </footer>
  );
}
