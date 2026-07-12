import Link from "next/link";
import { ArrowRight, BookOpen, Headphones, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ContentCard } from "@/components/content-card";
import { PublicImage } from "@/components/public-image";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [banners, categories, announcements, featured, latest, hot, favoriteCount] =
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
      prisma.favorite.count()
    ]);
  const hero = banners[0];

  return (
    <main>
      <section className="hero-stage">
        <PublicImage
          src={hero?.imageUrl || "/images/hero.svg"}
          alt={hero?.title || "FY的小站"}
          fill
          priority
          className="object-cover"
        />
        <div className="container hero-copy">
          <p className="hero-eyebrow"><Sparkles className="size-3.5" />资源收藏 · 学习资料 · 技术文章</p>
          <h1>{hero?.title || "FY的小站"}</h1>
          <p className="mt-5 text-base leading-8 text-white/86 md:text-xl">
            {hero?.subtitle || "把常用资源、学习路线和技术资料集中整理，方便快速查找、收藏和持续更新。"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contents" className="btn btn-primary">
              浏览内容
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/music" className="btn border-white/25 bg-white/10 text-white hover:bg-white/16">
              <Headphones className="size-4" />
              音乐小角落
            </Link>
          </div>
          <div className="hero-metrics">
            <span>按主题整理</span>
            <span>持续补充更新</span>
            <span>登录后同步收藏</span>
          </div>
        </div>
      </section>

      <section className="container -mt-12 grid gap-5 lg:grid-cols-[1fr_340px]">
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
        <aside className="card relative z-10 p-5 sm:p-6">
          <p className="admin-kicker">站点动态</p>
          <h2 className="mt-1 font-bold">网站公告</h2>
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
        <div className="section-heading">
          <div><p className="admin-kicker">按主题浏览</p><h2>分类导航</h2></div>
          <Link href="/contents" className="btn min-h-9 text-sm"><BookOpen className="size-4" />全部内容</Link>
        </div>
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
      <HomeBlock title="最新内容" items={latest} />
      <HomeBlock title="热门内容" items={hot} />
      <Footer />
    </main>
  );
}

function HomeBlock({ title, items }: { title: string; items: Parameters<typeof ContentCard>[0]["item"][] }) {
  return (
    <section className="container py-6">
      <div className="section-heading">
        <div><p className="admin-kicker">持续整理</p><h2>{title}</h2></div>
        <Link href="/contents" className="btn min-h-9 text-sm">
          查看更多<ArrowRight className="size-4" />
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state p-8 text-center muted">暂无内容，稍后再来看看。</div>
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
