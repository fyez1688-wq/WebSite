import { ok } from "@/lib/response";
import { listPublicMusic } from "@/services/music";

export async function GET(request: Request) {
  return ok(await listPublicMusic(new URL(request.url).searchParams));
}
