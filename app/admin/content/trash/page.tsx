import { AdminTrashClient } from "@/components/admin-trash-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentTrashPage() {
  const items = await prisma.content.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, title: true, slug: true, status: true, deletedAt: true, updatedAt: true },
    orderBy: { deletedAt: "desc" },
    take: 100
  });
  return <AdminTrashClient items={items} />;
}
