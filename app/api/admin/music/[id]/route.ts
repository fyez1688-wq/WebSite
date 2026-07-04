import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";
import { musicTrackUpdateSchema } from "@/lib/validators";
import { softDeleteMusicTrack, updateMusicTrack } from "@/services/music";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const item = await prisma.musicTrack.findFirst({ where: { id, deletedAt: null } });
  if (!item) return fail("MUSIC_NOT_FOUND", "音乐不存在", 404);
  return ok({ item });
}

export async function PATCH(request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = musicTrackUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");
  try {
    const item = await updateMusicTrack(id, parsed.data, session.user.id);
    return ok({ item }, "音乐已更新");
  } catch (error) {
    return fail("MUSIC_UPDATE_FAILED", error instanceof Error ? error.message : "音乐更新失败");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  try {
    const item = await softDeleteMusicTrack(id, session.user.id);
    return ok({ item }, "音乐已删除");
  } catch (error) {
    return fail("MUSIC_DELETE_FAILED", error instanceof Error ? error.message : "音乐删除失败");
  }
}
