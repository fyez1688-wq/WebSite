import type { Metadata } from "next";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { FavoritesClient } from "@/components/favorites-client";

export const metadata: Metadata = { title: "我的收藏" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await requireUser();
  const items = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { content: { include: { category: true, tags: { include: { tag: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-semibold">我的收藏</h1>
      <FavoritesClient items={items} />
    </main>
  );
}
