import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { contentInputSchema } from "@/lib/validators";
import { softDeleteContent, updateContent } from "@/services/content";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = contentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  try {
    const content = await updateContent(id, parsed.data, session.user.id, parsed.data.status === "DRAFT");
    return ok({ content }, "内容已更新");
  } catch (error) {
    const message = error instanceof Error ? error.message : "内容更新失败";
    return fail(message.includes("其他管理员") ? "CONFLICT" : "CONTENT_UPDATE_FAILED", message, message.includes("其他管理员") ? 409 : 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  await softDeleteContent(id, session.user.id);
  return ok({ id }, "内容已删除");
}

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const content = await prisma.content.findUnique({
    where: { id },
    include: { category: true, tags: { include: { tag: true } }, resourceDetail: true }
  });
  if (!content) return fail("NOT_FOUND", "内容不存在", 404);
  return ok({ content });
}
