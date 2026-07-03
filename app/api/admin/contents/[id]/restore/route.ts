import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { writeOperationLog } from "@/services/operation-log";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const content = await prisma.content.update({
    where: { id },
    data: { deletedAt: null, deletedById: null, updatedById: session.user.id }
  });
  await writeOperationLog({
    actorId: session.user.id,
    action: "RESTORE",
    target: "Content",
    targetId: id,
    targetTitle: content.title,
    description: "恢复回收站内容"
  });
  return ok({ content }, "内容已恢复");
}
