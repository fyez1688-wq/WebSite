import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";
import { tagSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = tagSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  const item = await prisma.tag.update({ where: { id }, data: parsed.data });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "UPDATE", target: "Tag", targetId: id, ip: await clientIp() }
  });
  return ok({ item }, "标签已更新");
}

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  await prisma.tag.delete({ where: { id } });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "DELETE", target: "Tag", targetId: id, ip: await clientIp() }
  });
  return ok({ id }, "标签已删除");
}
