import { prisma } from "@/lib/prisma";
import { AdminTaxonomyClient } from "@/components/admin-taxonomy-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const items = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return <AdminTaxonomyClient title="分类管理" endpoint="/api/admin/categories" hasSort initialItems={items} />;
}
