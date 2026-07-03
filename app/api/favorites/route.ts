import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import { requireUserApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";

const favoriteSchema = z.object({ contentId: z.string().min(1) });
const mergeSchema = z.object({ contentIds: z.array(z.string()).max(200) });

export async function GET(request: Request) {
  const { session, response } = await requireUserApi();
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const where = {
    userId: session.user.id,
    content: {
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" as const } },
              { summary: { contains: keyword, mode: "insensitive" as const } }
            ]
          }
        : {}),
      ...(category ? { category: { slug: category } } : {})
    }
  };
  const items = await prisma.favorite.findMany({
    where,
    include: { content: { include: { category: true, tags: { include: { tag: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  return ok({ items });
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireUserApi();
  if (response) return response;
  const parsed = favoriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "收藏参数错误");
  try {
    return ok(await addFavorite(session.user.id, parsed.data.contentId));
  } catch (error) {
    return fail("FAVORITE_FAILED", error instanceof Error ? error.message : "收藏失败");
  }
}

export async function DELETE(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireUserApi();
  if (response) return response;
  const parsed = favoriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "取消收藏参数错误");
  return ok(await removeFavorite(session.user.id, parsed.data.contentId));
}

export async function PUT(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireUserApi();
  if (response) return response;
  const parsed = mergeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "同步收藏参数错误");
  const uniqueIds = [...new Set(parsed.data.contentIds)];
  const results = [];
  for (const contentId of uniqueIds) {
    try {
      results.push({ contentId, result: await addFavorite(session.user.id, contentId) });
    } catch {
      results.push({ contentId, skipped: true });
    }
  }
  return ok({ results });
}
