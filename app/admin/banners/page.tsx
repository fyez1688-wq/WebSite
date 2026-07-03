import { prisma } from "@/lib/prisma";
import { AdminBannerClient } from "@/components/admin-banner-client";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const items = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return <AdminBannerClient initialItems={items} />;
}
