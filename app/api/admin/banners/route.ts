import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";
import { bannerSchema } from "@/lib/validators";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const items = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return ok({ items });
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = bannerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  const item = await prisma.banner.create({ data: parsed.data });
  await prisma.operationLog.create({
    data: { actorId: session.user.id, action: "CREATE", target: "Banner", targetId: item.id, ip: await clientIp() }
  });
  return ok({ item }, "轮播图已创建");
}
