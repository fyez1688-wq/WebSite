import { prisma } from "@/lib/prisma";
import { AdminTaxonomyClient } from "@/components/admin-taxonomy-client";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const items = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return <AdminTaxonomyClient title="标签管理" endpoint="/api/admin/tags" initialItems={items} />;
}
