import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";
import { adminUserSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = adminUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  if (id === session.user.id && parsed.data.status && parsed.data.status !== "ACTIVE") {
    return fail("SELF_DISABLE_BLOCKED", "不能禁用当前登录的管理员", 400);
  }
  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { favorites: true } }
    }
  });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "UPDATE", target: "User", targetId: id, ip: await clientIp() }
  });
  return ok({ user }, "用户已更新");
}

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  if (id === session.user.id) return fail("SELF_DELETE_BLOCKED", "不能删除当前登录的管理员", 400);
  const user = await prisma.user.update({
    where: { id },
    data: { status: "DELETED" },
    select: { id: true }
  });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "DELETE", target: "User", targetId: id, ip: await clientIp() }
  });
  return ok({ id: user.id }, "用户已标记删除");
}
