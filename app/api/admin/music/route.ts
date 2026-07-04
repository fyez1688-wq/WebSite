import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { musicTrackSchema } from "@/lib/validators";
import { createMusicTrack, listAdminMusic } from "@/services/music";

export async function GET(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;
  return ok(await listAdminMusic(new URL(request.url).searchParams));
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const parsed = musicTrackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  try {
    const item = await createMusicTrack(parsed.data, session.user.id);
    return ok({ item }, "音乐已创建");
  } catch (error) {
    return fail("MUSIC_CREATE_FAILED", error instanceof Error ? error.message : "音乐创建失败");
  }
}
