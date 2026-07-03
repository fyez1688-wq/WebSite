import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, clientIp } from "@/lib/security";
import { announcementSchema } from "@/lib/validators";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ items });
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = announcementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  const item = await prisma.announcement.create({ data: parsed.data });
  await prisma.operationLog.create({
    data: {
      actorId: session.user.id,
      action: "CREATE",
      target: "Announcement",
      targetId: item.id,
      ip: await clientIp()
    }
  });
  return ok({ item }, "公告已创建");
}
