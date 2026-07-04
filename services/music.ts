import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { musicTrackSchema } from "@/lib/validators";
import type { z } from "zod";

export type MusicTrackInput = z.infer<typeof musicTrackSchema>;

const playBuckets = new Map<string, number>();

function cleanNullable(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

function trackData(input: MusicTrackInput, actorId: string) {
  return {
    title: input.title.trim(),
    artist: cleanNullable(input.artist),
    album: cleanNullable(input.album),
    description: cleanNullable(input.description),
    coverImage: cleanNullable(input.coverImage),
    audioUrl: input.audioUrl.trim(),
    sourceUrl: cleanNullable(input.sourceUrl),
    license: cleanNullable(input.license),
    category: cleanNullable(input.category),
    duration: input.duration ?? null,
    sortOrder: input.sortOrder || 0,
    isPublished: input.isPublished || false,
    isFeatured: input.isFeatured || false,
    updatedById: actorId
  };
}

export function publicMusicSelect() {
  return {
    id: true,
    title: true,
    artist: true,
    album: true,
    description: true,
    coverImage: true,
    audioUrl: true,
    sourceUrl: true,
    license: true,
    category: true,
    duration: true,
    sortOrder: true,
    isFeatured: true,
    playCount: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.MusicTrackSelect;
}

export async function listPublicMusic(params: URLSearchParams) {
  const page = Math.max(Number(params.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || 24), 6), 60);
  const query = params.get("q")?.trim();
  const category = params.get("category")?.trim();
  const where: Prisma.MusicTrackWhereInput = {
    isPublished: true,
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { artist: { contains: query, mode: "insensitive" } },
            { album: { contains: query, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const [items, total, categories] = await prisma.$transaction([
    prisma.musicTrack.findMany({
      where,
      select: publicMusicSelect(),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.musicTrack.count({ where }),
    prisma.musicTrack.findMany({
      where: { isPublished: true, deletedAt: null, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" }
    })
  ]);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    categories: categories.map((item) => item.category).filter(Boolean)
  };
}

export async function listFeaturedMusic(take = 6) {
  const items = await prisma.musicTrack.findMany({
    where: { isPublished: true, isFeatured: true, deletedAt: null },
    select: publicMusicSelect(),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take
  });
  return { items };
}

export async function listAdminMusic(params: URLSearchParams) {
  const page = Math.max(Number(params.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || 20), 10), 100);
  const keyword = params.get("keyword")?.trim();
  const category = params.get("category")?.trim();
  const published = params.get("published");
  const featured = params.get("featured");
  const where: Prisma.MusicTrackWhereInput = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(published === "true" ? { isPublished: true } : {}),
    ...(published === "false" ? { isPublished: false } : {}),
    ...(featured === "true" ? { isFeatured: true } : {}),
    ...(featured === "false" ? { isFeatured: false } : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { artist: { contains: keyword, mode: "insensitive" } },
            { album: { contains: keyword, mode: "insensitive" } },
            { category: { contains: keyword, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const [items, total] = await prisma.$transaction([
    prisma.musicTrack.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.musicTrack.count({ where })
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

export async function createMusicTrack(input: MusicTrackInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.musicTrack.create({
      data: { ...trackData(input, actorId), createdById: actorId }
    });
    await tx.operationLog.create({
      data: {
        actorId,
        action: input.isPublished ? "PUBLISH" : "CREATE",
        target: "MusicTrack",
        targetId: item.id,
        targetTitle: item.title,
        description: input.isPublished ? "创建并发布音乐" : "创建音乐"
      }
    });
    return item;
  });
}

export async function updateMusicTrack(id: string, input: Partial<MusicTrackInput>, actorId: string) {
  const existing = await prisma.musicTrack.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new Error("音乐不存在");
  const merged = { ...existing, ...input, title: input.title ?? existing.title, audioUrl: input.audioUrl ?? existing.audioUrl };
  return prisma.$transaction(async (tx) => {
    const item = await tx.musicTrack.update({
      where: { id },
      data: trackData(merged, actorId)
    });
    await tx.operationLog.create({
      data: {
        actorId,
        action: item.isPublished ? "PUBLISH" : "UPDATE",
        target: "MusicTrack",
        targetId: item.id,
        targetTitle: item.title,
        description: "更新音乐"
      }
    });
    return item;
  });
}

export async function softDeleteMusicTrack(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.musicTrack.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId, isPublished: false, isFeatured: false }
    });
    await tx.operationLog.create({
      data: {
        actorId,
        action: "DELETE",
        target: "MusicTrack",
        targetId: item.id,
        targetTitle: item.title,
        description: "软删除音乐"
      }
    });
    return item;
  });
}

export async function incrementMusicPlayCount(id: string, key: string) {
  const now = Date.now();
  const bucketKey = `${key}:${id}`;
  const last = playBuckets.get(bucketKey) || 0;
  const item = await prisma.musicTrack.findFirst({
    where: { id, isPublished: true, deletedAt: null },
    select: { id: true, playCount: true }
  });
  if (!item) throw new Error("音乐不存在");
  if (now - last < 30_000) return { playCount: item.playCount, counted: false };
  playBuckets.set(bucketKey, now);
  const updated = await prisma.musicTrack.update({
    where: { id },
    data: { playCount: { increment: 1 } },
    select: { playCount: true }
  });
  return { playCount: updated.playCount, counted: true };
}
