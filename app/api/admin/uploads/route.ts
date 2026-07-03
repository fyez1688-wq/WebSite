import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, checkRateLimit, clientIp } from "@/lib/security";
import { deleteImage, saveImage } from "@/services/storage";

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;
  const ip = await clientIp();
  if (!checkRateLimit(`upload:${ip}`, 30, 60_000))
    return fail("RATE_LIMITED", "上传过于频繁", 429);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("NO_FILE", "请选择图片文件");
  try {
    const image = await saveImage(file);
    return ok(image, "上传成功");
  } catch (error) {
    return fail(
      "UPLOAD_FAILED",
      error instanceof Error ? error.message : "上传失败"
    );
  }
}

export async function DELETE(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return fail("VALIDATION_ERROR", "缺少图片地址");
  try {
    await deleteImage(url);
    return ok({ url }, "图片已删除");
  } catch (error) {
    return fail(
      "DELETE_FAILED",
      error instanceof Error ? error.message : "删除失败",
      400
    );
  }
}
