import { ok } from "@/lib/response";
import { listFeaturedMusic } from "@/services/music";

export async function GET() {
  return ok(await listFeaturedMusic(6));
}
