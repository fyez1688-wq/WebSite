import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { changePasswordSchema, profileSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireUserApi();
  if (response) return response;
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "资料格式不正确");
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname: parsed.data.nickname, avatar: parsed.data.avatar || null },
    select: { id: true, email: true, nickname: true, avatar: true }
  });
  return ok({ user }, "资料已更新");
}

export async function PUT(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireUserApi();
  if (response) return response;
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "密码格式不正确");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return fail("PASSWORD_INVALID", "当前密码不正确");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) }
  });
  return ok({}, "密码已修改");
}
