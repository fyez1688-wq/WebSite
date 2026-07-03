import { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const contentInclude = {
  category: true,
  tags: { include: { tag: true } }
} satisfies Prisma.ContentInclude;

export function publicContentWhere(query?: string, category?: string, tag?: string) {
  const where: Prisma.ContentWhereInput = {
    status: ContentStatus.PUBLISHED,
    isHidden: false,
    deletedAt: null
  };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } }
    ];
  }
  if (category) where.category = { slug: category };
  if (tag) where.tags = { some: { tag: { slug: tag } } };
  return where;
}

export async function getContentList(params: {
  query?: string;
  category?: string;
  tag?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize || 12, 1), 48);
  const where = publicContentWhere(params.query, params.category, params.tag);
  const orderBy: Prisma.ContentOrderByWithRelationInput[] =
    params.order === "hot"
      ? [{ viewCount: "desc" }, { favoriteCount: "desc" }]
      : params.order === "featured"
        ? [{ isPinned: "desc" }, { isFeatured: "desc" }, { publishedAt: "desc" }]
        : [{ isPinned: "desc" }, { publishedAt: "desc" }];

  const [items, total] = await prisma.$transaction([
    prisma.content.findMany({
      where,
      include: contentInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.content.count({ where })
  ]);

  return { items, total, page, pageSize };
}
