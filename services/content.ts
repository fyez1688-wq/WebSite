import { ContentStatus, type ContentType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { contentBatchSchema, contentDraftSchema, contentInputSchema } from "@/lib/validators";
import type { z } from "zod";
import { writeOperationLog } from "@/services/operation-log";

export type ContentInput = z.infer<typeof contentInputSchema>;
export type ContentDraftInput = z.infer<typeof contentDraftSchema>;
export type ContentBatchInput = z.infer<typeof contentBatchSchema>;

export function makeSlug(title: string) {
  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `content-${Date.now().toString(36)}`;
}

function cleanNullable(value: string | null | undefined) {
  return value === "" ? null : value;
}

function resourceDetailData(input: ContentInput | ContentDraftInput) {
  const detail = input.resourceDetail;
  if (!detail) return undefined;
  return {
    softwareName: cleanNullable(detail.softwareName),
    softwareVersion: cleanNullable(detail.softwareVersion),
    supportedSystems: cleanNullable(detail.supportedSystems),
    fileSize: cleanNullable(detail.fileSize),
    officialUrl: cleanNullable(detail.officialUrl),
    downloadUrl: cleanNullable(detail.downloadUrl),
    extractionCode: cleanNullable(detail.extractionCode),
    installGuide: cleanNullable(detail.installGuide),
    requireLoginToDownload: detail.requireLoginToDownload || false,
    showDownloadCount: detail.showDownloadCount ?? true
  };
}

async function validateForPublish(input: ContentInput, currentId?: string) {
  if (!input.title.trim()) throw new Error("标题不能为空");
  if (!input.content.trim()) throw new Error("发布内容时正文不能为空");
  if (!input.categoryId) throw new Error("发布内容时必须选择分类");
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, isEnabled: true } });
  if (!category) throw new Error("分类不存在或已禁用");
  const duplicated = await prisma.content.findFirst({
    where: { slug: input.slug, id: currentId ? { not: currentId } : undefined },
    select: { id: true }
  });
  if (duplicated) throw new Error("slug已经存在");
  const tagCount = input.tagIds.length
    ? await prisma.tag.count({ where: { id: { in: input.tagIds } } })
    : 0;
  if (tagCount !== input.tagIds.length) throw new Error("标签不存在");
}

function contentData(input: ContentInput | ContentDraftInput, actorId: string) {
  return {
    title: input.title,
    slug: input.slug || makeSlug(input.title || "content"),
    summary: input.summary || "",
    content: input.content || "",
    coverImage: cleanNullable(input.coverImage),
    contentType: input.contentType as ContentType | undefined,
    status: input.status as ContentStatus | undefined,
    isFeatured: input.isFeatured || false,
    isPinned: input.isPinned || false,
    allowFavorite: input.allowFavorite ?? true,
    sortOrder: input.sortOrder || 0,
    seoTitle: cleanNullable(input.seoTitle),
    seoDescription: cleanNullable(input.seoDescription),
    seoKeywords: cleanNullable(input.seoKeywords),
    ogTitle: cleanNullable(input.ogTitle),
    ogDescription: cleanNullable(input.ogDescription),
    ogImage: cleanNullable(input.ogImage),
    canonicalUrl: cleanNullable(input.canonicalUrl),
    categoryId: cleanNullable(input.categoryId),
    updatedById: actorId
  };
}

export async function listAdminContents(params: URLSearchParams) {
  const page = Math.max(Number(params.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || 20), 10), 100);
  const keyword = params.get("keyword")?.trim();
  const where: Prisma.ContentWhereInput = {
    deletedAt: null,
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { summary: { contains: keyword, mode: "insensitive" } },
            { slug: { contains: keyword, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(params.get("status") ? { status: params.get("status") as ContentStatus } : {}),
    ...(params.get("contentType") ? { contentType: params.get("contentType") as ContentType } : {}),
    ...(params.get("categoryId") ? { categoryId: params.get("categoryId") } : {}),
    ...(params.get("tagId") ? { tags: { some: { tagId: params.get("tagId") || "" } } } : {}),
    ...(params.get("featured") === "true" ? { isFeatured: true } : {}),
    ...(params.get("featured") === "false" ? { isFeatured: false } : {}),
    ...(params.get("pinned") === "true" ? { isPinned: true } : {}),
    ...(params.get("pinned") === "false" ? { isPinned: false } : {})
  };
  const orderMap: Record<string, Prisma.ContentOrderByWithRelationInput> = {
    createdAsc: { createdAt: "asc" },
    updatedDesc: { updatedAt: "desc" },
    viewDesc: { viewCount: "desc" },
    favoriteDesc: { favoriteCount: "desc" },
    sortDesc: { sortOrder: "desc" }
  };
  const orderBy = orderMap[params.get("sort") || ""] || { createdAt: "desc" };
  const [items, total] = await prisma.$transaction([
    prisma.content.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        coverImage: true,
        contentType: true,
        status: true,
        isFeatured: true,
        isPinned: true,
        allowFavorite: true,
        viewCount: true,
        favoriteCount: true,
        downloadCount: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        category: true,
        tags: { include: { tag: true } }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.content.count({ where })
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function createContent(input: ContentInput | ContentDraftInput, actorId: string, forceDraft = false) {
  const status = forceDraft ? ContentStatus.DRAFT : ((input.status || "DRAFT") as ContentStatus);
  const fullInput = { ...input, status } as ContentInput;
  if (status === ContentStatus.PUBLISHED) await validateForPublish(fullInput);
  const detail = resourceDetailData(input);
  return prisma.$transaction(async (tx) => {
    const content = await tx.content.create({
      data: {
        ...contentData(fullInput, actorId),
        createdById: actorId,
        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
        tags: { create: (input.tagIds || []).map((tagId) => ({ tagId })) },
        resourceDetail: detail ? { create: detail } : undefined
      }
    });
    await tx.operationLog.create({
      data: {
        actorId,
        action: status === ContentStatus.PUBLISHED ? "PUBLISH" : "CREATE",
        target: "Content",
        targetId: content.id,
        targetTitle: content.title,
        description: status === ContentStatus.PUBLISHED ? "创建并发布内容" : "创建内容草稿"
      }
    });
    return content;
  });
}

export async function updateContent(id: string, input: ContentInput | ContentDraftInput, actorId: string, forceDraft = false) {
  const existing = await prisma.content.findUnique({ where: { id }, include: { resourceDetail: true } });
  if (!existing || existing.deletedAt) throw new Error("内容不存在");
  if (input.lastUpdatedAt && existing.updatedAt.toISOString() !== input.lastUpdatedAt) {
    throw new Error("该内容已经被其他管理员修改，请刷新页面后重新编辑。");
  }
  const status = forceDraft ? ContentStatus.DRAFT : ((input.status || existing.status) as ContentStatus);
  const fullInput = { ...input, status, title: input.title || existing.title, slug: input.slug || existing.slug } as ContentInput;
  if (status === ContentStatus.PUBLISHED) await validateForPublish(fullInput, id);
  const detail = resourceDetailData(input);
  return prisma.$transaction(async (tx) => {
    if (input.tagIds) {
      await tx.contentTag.deleteMany({ where: { contentId: id } });
      if (input.tagIds.length) await tx.contentTag.createMany({ data: input.tagIds.map((tagId) => ({ contentId: id, tagId })) });
    }
    const content = await tx.content.update({
      where: { id },
      data: {
        ...contentData(fullInput, actorId),
        status,
        publishedAt:
          status === ContentStatus.PUBLISHED && !existing.publishedAt ? new Date() : status === ContentStatus.PUBLISHED ? existing.publishedAt : undefined,
        resourceDetail: detail
          ? {
              upsert: {
                create: detail,
                update: detail
              }
            }
          : undefined
      }
    });
    await tx.operationLog.create({
      data: {
        actorId,
        action: status === ContentStatus.PUBLISHED ? "PUBLISH" : status === ContentStatus.OFFLINE ? "OFFLINE" : "UPDATE",
        target: "Content",
        targetId: content.id,
        targetTitle: content.title,
        description: forceDraft ? "保存草稿" : "更新内容"
      }
    });
    return content;
  });
}

export async function softDeleteContent(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const content = await tx.content.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId, updatedById: actorId }
    });
    await tx.operationLog.create({
      data: { actorId, action: "DELETE", target: "Content", targetId: id, targetTitle: content.title, description: "软删除内容" }
    });
    return content;
  });
}

export async function batchOperateContent(input: ContentBatchInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const data: Prisma.ContentUpdateManyMutationInput = {};
    if (input.action === "PUBLISH") Object.assign(data, { status: ContentStatus.PUBLISHED, publishedAt: new Date() });
    if (input.action === "OFFLINE") Object.assign(data, { status: ContentStatus.OFFLINE });
    if (input.action === "DELETE") Object.assign(data, { deletedAt: new Date(), deletedById: actorId });
    if (input.action === "FEATURE") Object.assign(data, { isFeatured: true });
    if (input.action === "UNFEATURE") Object.assign(data, { isFeatured: false });
    if (input.action === "PIN") Object.assign(data, { isPinned: true });
    if (input.action === "UNPIN") Object.assign(data, { isPinned: false });
    if (input.action === "MOVE_CATEGORY") Object.assign(data, { categoryId: input.categoryId || null });
    const where: Prisma.ContentWhereInput = { id: { in: input.ids }, deletedAt: null };
    if (input.action === "PUBLISH") {
      Object.assign(where, {
        title: { not: "" },
        content: { not: "" },
        categoryId: { not: null }
      });
    }
    const result = await tx.content.updateMany({ where, data });
    await tx.operationLog.create({
      data: {
        actorId,
        action: input.action === "OFFLINE" ? "OFFLINE" : input.action === "PUBLISH" ? "PUBLISH" : input.action === "DELETE" ? "DELETE" : "UPDATE",
        target: "Content",
        description: `批量操作 ${input.action}，数量 ${result.count}`,
        detail: JSON.stringify({ ids: input.ids, action: input.action })
      }
    });
    return { successCount: result.count, failedCount: input.ids.length - result.count };
  });
}
