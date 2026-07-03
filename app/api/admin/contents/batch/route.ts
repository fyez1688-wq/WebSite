import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { contentBatchSchema } from "@/lib/validators";
import { batchOperateContent } from "@/services/content";

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = contentBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  const result = await batchOperateContent(parsed.data, session.user.id);
  return ok(result, "批量操作完成");
}
