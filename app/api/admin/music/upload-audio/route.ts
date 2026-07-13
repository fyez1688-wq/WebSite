import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin, checkRateLimit, clientIp } from "@/lib/security";
import { deleteAudio, saveAudio } from "@/services/storage";

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;
  const ip = await clientIp();
  if (!checkRateLimit(`music-audio-upload:${ip}`, 10, 60_000)) return fail("RATE_LIMITED", "上传过于频繁", 429);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("NO_FILE", "请选择音频文件");
  try {
    return ok(await saveAudio(file), "音频上传成功");
  } catch (error) {
    return fail("AUDIO_UPLOAD_FAILED", error instanceof Error ? error.message : "音频上传失败");
  }
}

export async function DELETE(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  const provider = typeof body?.provider === "string" ? body.provider.trim() : "";
  if (!url && !key) return fail("VALIDATION_ERROR", "缺少音频地址或对象 key");
  try {
    await deleteAudio({ url, key, provider });
    return ok({ url: url || undefined, key: key || undefined, provider: provider || undefined }, "音频已删除");
  } catch (error) {
    return fail("AUDIO_DELETE_FAILED", error instanceof Error ? error.message : "音频删除失败", 400);
  }
}
