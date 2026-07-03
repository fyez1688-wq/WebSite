import Link from "next/link";
import { requireAdmin } from "@/lib/permissions";

const nav = [
  ["/admin", "数据概览"],
  ["/admin/content", "内容管理"],
  ["/admin/content/create", "新建内容"],
  ["/admin/categories", "分类管理"],
  ["/admin/tags", "标签管理"],
  ["/admin/content/trash", "回收站"],
  ["/admin/users", "用户管理"],
  ["/admin/banners", "轮播图管理"],
  ["/admin/announcements", "公告管理"],
  ["/admin/settings", "网站设置"],
  ["/admin/logs", "操作日志"]
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="container grid gap-5 py-8 lg:grid-cols-[236px_1fr]">
      <aside className="admin-panel h-fit p-3 lg:sticky lg:top-24">
        <h1 className="px-3 py-3 text-lg font-semibold">管理后台</h1>
        <nav className="grid gap-1">
          {nav.map(([href, label]) => (
            <Link key={href} className="btn justify-start border-transparent" href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </main>
  );
}
