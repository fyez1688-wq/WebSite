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

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const count = await prisma.content.count({ where: { categoryId: id, deletedAt: null } });
  if (count > 0) return fail("CATEGORY_IN_USE", "该分类下仍有内容，请先移动内容后再删除", 400);
  await prisma.category.delete({ where: { id } });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "DELETE", target: "Category", targetId: id, ip: await clientIp() }
  });
  return ok({ id }, "分类已删除");
}
