import { fail, ok } from "@/lib/response";
import { clientIp } from "@/lib/security";
import { incrementMusicPlayCount } from "@/services/music";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const ip = await clientIp();
  const agent = request.headers.get("user-agent") || "unknown";
  try {
    return ok(await incrementMusicPlayCount(id, `${ip}:${agent.slice(0, 80)}`));
  } catch (error) {
    return fail("MUSIC_NOT_FOUND", error instanceof Error ? error.message : "音乐不存在", 404);
  }
}
