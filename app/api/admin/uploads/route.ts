import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, checkRateLimit, clientIp } from "@/lib/security";
import { saveLocalImage } from "@/services/storage";

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;
  const ip = await clientIp();
  if (!checkRateLimit(`upload:${ip}`, 30, 60_000)) return fail("RATE_LIMITED", "上传过于频繁", 429);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("NO_FILE", "请选择图片文件");
  try {
    const url = await saveLocalImage(file);
    return ok({ url }, "上传成功");
  } catch (error) {
    return fail("UPLOAD_FAILED", error instanceof Error ? error.message : "上传失败");
  }
}
