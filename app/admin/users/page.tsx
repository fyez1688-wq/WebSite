import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin-users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nickname: true, role: true, status: true, createdAt: true, _count: { select: { favorites: true } } },
    orderBy: { createdAt: "desc" }
  });
  return <AdminUsersClient initialUsers={users} />;
}
