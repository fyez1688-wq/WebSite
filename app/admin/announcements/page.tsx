import { prisma } from "@/lib/prisma";
import { AdminAnnouncementClient } from "@/components/admin-announcement-client";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return <AdminAnnouncementClient initialItems={items} />;
}
