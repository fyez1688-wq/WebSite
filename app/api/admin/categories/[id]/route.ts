import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";
import { categorySchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = categorySchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  const item = await prisma.category.update({ where: { id }, data: parsed.data });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "UPDATE", target: "Category", targetId: id, ip: await clientIp() }
  });
  return ok({ item }, "分类已更新");
}

export async function DELETE(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const moveToCategoryId = typeof body?.moveToCategoryId === "string" && body.moveToCategoryId.trim() ? body.moveToCategoryId.trim() : null;
  const ip = await clientIp();

  if (moveToCategoryId === id) return fail("INVALID_TARGET_CATEGORY", "不能移动到当前分类", 400);

  const result = await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id } });
    if (!category) throw new Error("分类不存在");

    const count = await tx.content.count({ where: { categoryId: id, deletedAt: null } });
    if (count > 0 && !moveToCategoryId) {
      return { blocked: true, count, category };
    }

    let targetTitle: string | null = null;
    if (count > 0 && moveToCategoryId) {
      const target = await tx.category.findFirst({
        where: { id: moveToCategoryId, isEnabled: true },
        select: { id: true, name: true }
      });
      if (!target) throw new Error("目标分类不存在或已禁用");
      await tx.content.updateMany({ where: { categoryId: id, deletedAt: null }, data: { categoryId: target.id } });
      targetTitle = target.name;
    }

    await tx.category.delete({ where: { id } });
    await tx.operationLog.create({
      data: {
        actorId: session.user.id,
        action: "DELETE",
        target: "Category",
        targetId: id,
        targetTitle: category.name,
        description: targetTitle ? `删除分类并将 ${count} 条内容移动到 ${targetTitle}` : "删除分类",
        detail: JSON.stringify({ movedContentCount: count, moveToCategoryId }),
        ip
      }
    });
    return { blocked: false, count, category, targetTitle };
  });

  if (result.blocked) {
    return fail("CATEGORY_IN_USE", `该分类下仍有 ${result.count} 条内容，请选择目标分类后再删除`, 400);
  }

  return ok({ id, movedContentCount: result.count }, result.targetTitle ? `分类已删除，内容已移动到 ${result.targetTitle}` : "分类已删除");
}
