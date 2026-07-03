import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function addFavorite(userId: string, contentId: string) {
  return prisma.$transaction(async (tx) => {
    const content = await tx.content.findFirst({
      where: { id: contentId, status: ContentStatus.PUBLISHED, isHidden: false, deletedAt: null, allowFavorite: true },
      select: { id: true }
    });
    if (!content) throw new Error("内容不存在或不可收藏");

    const existing = await tx.favorite.findUnique({
      where: { userId_contentId: { userId, contentId } }
    });
    if (existing) return { favorited: true, changed: false };

    await tx.favorite.create({ data: { userId, contentId } });
    await tx.content.update({
      where: { id: contentId },
      data: { favoriteCount: { increment: 1 } }
    });
    return { favorited: true, changed: true };
  });
}

export async function removeFavorite(userId: string, contentId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.favorite.findUnique({
      where: { userId_contentId: { userId, contentId } }
    });
    if (!existing) return { favorited: false, changed: false };

    await tx.favorite.delete({ where: { id: existing.id } });
    await tx.content.update({
      where: { id: contentId },
      data: { favoriteCount: { decrement: 1 } }
    });
    await tx.content.updateMany({
      where: { id: contentId, favoriteCount: { lt: 0 } },
      data: { favoriteCount: 0 }
    });
    return { favorited: false, changed: true };
  });
}
