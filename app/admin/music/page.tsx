import { AdminMusicClient } from "@/components/admin-music-client";
import { listAdminMusic } from "@/services/music";

export const dynamic = "force-dynamic";

export default async function AdminMusicPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value) params.set(key, value);
  }
  const data = await listAdminMusic(params);
  return <AdminMusicClient {...data} />;
}
