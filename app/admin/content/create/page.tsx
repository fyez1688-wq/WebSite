import { prisma } from "@/lib/prisma";
import { AdminContentForm } from "@/components/admin-content-form";

export const dynamic = "force-dynamic";

export default async function AdminContentCreatePage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } })
  ]);
  return <AdminContentForm mode="create" categories={categories} tags={tags} />;
}
