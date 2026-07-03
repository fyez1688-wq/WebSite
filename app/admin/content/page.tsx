import { prisma } from "@/lib/prisma";
import { listAdminContents } from "@/services/content";
import { AdminContentList } from "@/components/admin-content-list";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const [data, categories, tags] = await Promise.all([
    listAdminContents(params),
    prisma.category.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  return <AdminContentList {...data} categories={categories} tags={tags} />;
}
