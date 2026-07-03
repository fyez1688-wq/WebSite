import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, checkRateLimit, clientIp } from "@/lib/security";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;

  const ip = await clientIp();
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60_000)) {
    return fail("RATE_LIMITED", "注册过于频繁，请稍后再试", 429);
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return fail("EMAIL_EXISTS", "该邮箱已经注册", 409);

  await prisma.user.create({
    data: {
      email,
      nickname: parsed.data.nickname,
      passwordHash: await bcrypt.hash(parsed.data.password, 12)
    }
  });

  return ok({ email }, "注册成功");
}
