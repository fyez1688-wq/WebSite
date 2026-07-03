import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { writeOperationLog } from "@/services/operation-log";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, select: { title: true } });
  if (!content) return fail("NOT_FOUND", "内容不存在", 404);
  await prisma.content.delete({ where: { id } });
  await writeOperationLog({
    actorId: session.user.id,
    action: "DELETE",
    target: "Content",
    targetId: id,
    targetTitle: content.title,
    description: "永久删除内容"
  });
  return ok({ id }, "内容已永久删除");
}
