import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const items = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  return <div className="card p-5"><h2 className="text-2xl font-semibold">网站设置</h2><div className="mt-4 grid gap-2">{items.map((i) => <div className="flex justify-between border-b border-[var(--border)] py-2" key={i.id}><span>{i.label || i.key}</span><span className="muted">{i.value}</span></div>)}</div></div>;
}
