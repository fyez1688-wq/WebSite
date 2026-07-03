import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminContentForm } from "@/components/admin-content-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminContentEditPage({ params }: Props) {
  const { id } = await params;
  const [content, categories, tags] = await Promise.all([
    prisma.content.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, resourceDetail: true }
    }),
    prisma.category.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!content) notFound();
  return <AdminContentForm mode="edit" content={content} categories={categories} tags={tags} />;
}
