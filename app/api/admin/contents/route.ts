import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { contentInputSchema } from "@/lib/validators";
import { createContent, listAdminContents } from "@/services/content";

export async function GET(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const data = await listAdminContents(new URL(request.url).searchParams);
  return ok(data);
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = contentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");

  try {
    const content = await createContent(parsed.data, session.user.id, parsed.data.status === "DRAFT");
    return ok({ content }, "内容已创建");
  } catch (error) {
    return fail("CONTENT_CREATE_FAILED", error instanceof Error ? error.message : "内容创建失败");
  }
}
