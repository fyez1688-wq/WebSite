import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const contents = await prisma.content.findMany({
    where: { status: "PUBLISHED", isHidden: false, deletedAt: null },
    select: { slug: true, updatedAt: true }
  });
  return [
    { url: site, lastModified: new Date() },
    { url: `${site}/contents`, lastModified: new Date() },
    { url: `${site}/search`, lastModified: new Date() },
    ...contents.map((item) => ({
      url: `${site}/contents/${item.slug}`,
      lastModified: item.updatedAt
    }))
  ];
}
