import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const mergeTagSchema = z.object({
  targetTagId: z.string().trim().min(1, "请选择目标标签")
});

export async function POST(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await params;
  const parsed = mergeTagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");

  const targetTagId = parsed.data.targetTagId;
  if (targetTagId === id) return fail("INVALID_TARGET_TAG", "不能合并到当前标签", 400);

  const ip = await clientIp();

  const result = await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.tag.findUnique({ where: { id }, select: { id: true, name: true, slug: true } }),
      tx.tag.findUnique({ where: { id: targetTagId }, select: { id: true, name: true, slug: true } })
    ]);

    if (!source) return { error: "SOURCE_NOT_FOUND" as const };
    if (!target) return { error: "TARGET_NOT_FOUND" as const };

    const sourceRelations = await tx.contentTag.findMany({
      where: { tagId: source.id },
      select: { contentId: true }
    });
    const sourceContentIds = sourceRelations.map((item) => item.contentId);

    const existingTargetRelations = sourceContentIds.length
      ? await tx.contentTag.findMany({
          where: { tagId: target.id, contentId: { in: sourceContentIds } },
          select: { contentId: true }
        })
      : [];
    const existingTargetIds = new Set(existingTargetRelations.map((item) => item.contentId));
    const relationsToCreate = sourceContentIds
      .filter((contentId) => !existingTargetIds.has(contentId))
      .map((contentId) => ({ contentId, tagId: target.id }));

    if (relationsToCreate.length) {
      await tx.contentTag.createMany({ data: relationsToCreate });
    }

    await tx.tag.delete({ where: { id: source.id } });
    await tx.operationLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE",
        target: "Tag",
        targetId: target.id,
        targetTitle: target.name,
        description: `将标签 ${source.name} 合并到 ${target.name}`,
        detail: JSON.stringify({
          sourceTagId: source.id,
          sourceTagName: source.name,
          sourceTagSlug: source.slug,
          targetTagId: target.id,
          targetTagName: target.name,
          targetTagSlug: target.slug,
          movedRelationCount: sourceRelations.length,
          skippedDuplicateRelationCount: existingTargetRelations.length
        }),
        ip
      }
    });

    return {
      source,
      target,
      movedRelationCount: sourceRelations.length,
      createdRelationCount: relationsToCreate.length,
      skippedDuplicateRelationCount: existingTargetRelations.length
    };
  });

  if ("error" in result) {
    if (result.error === "SOURCE_NOT_FOUND") return fail("TAG_NOT_FOUND", "源标签不存在", 404);
    return fail("TARGET_TAG_NOT_FOUND", "目标标签不存在", 404);
  }

  return ok(
    {
      sourceTagId: result.source.id,
      targetTagId: result.target.id,
      movedRelationCount: result.movedRelationCount,
      createdRelationCount: result.createdRelationCount,
      skippedDuplicateRelationCount: result.skippedDuplicateRelationCount
    },
    `已将 ${result.source.name} 合并到 ${result.target.name}`
  );
}
