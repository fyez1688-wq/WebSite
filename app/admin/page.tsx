import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [userCount, contentCount, publishedCount, draftCount, favoriteCount, todayUsers, hot] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.content.count(),
      prisma.content.count({ where: { status: "PUBLISHED" } }),
      prisma.content.count({ where: { status: "DRAFT" } }),
      prisma.favorite.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.content.findMany({ orderBy: { viewCount: "desc" }, take: 8 })
    ]);
  const cards = [
    ["用户总数", userCount],
    ["内容总数", contentCount],
    ["已发布数量", publishedCount],
    ["草稿数量", draftCount],
    ["总收藏次数", favoriteCount],
    ["今日新增用户", todayUsers],
    ["今日浏览量", hot.reduce((sum, item) => sum + item.viewCount, 0)]
  ];
  return (
    <div className="admin-stack">
      <div>
        <p className="admin-kicker">站点运营</p>
        <h2 className="text-2xl font-semibold">数据概览</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="admin-panel">
            <p className="muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="admin-panel">
        <h3 className="font-semibold">热门内容排行</h3>
        <div className="mt-3 grid gap-2">
          {hot.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-[var(--border)] py-2 last:border-0">
              <span>{item.title}</span>
              <span className="muted">{item.viewCount} 浏览</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
