import Link from "next/link";
import type { Content, Category, ContentTag, Tag } from "@prisma/client";
import { FavoriteButton } from "@/components/favorite-button";
import { PublicImage } from "@/components/public-image";

type Item = Content & {
  category: Category | null;
  tags: (ContentTag & { tag: Tag })[];
};

export function ContentCard({ item }: { item: Item }) {
  return (
    <article className="card overflow-hidden">
      <Link href={`/contents/${item.slug}`} className="block">
        <PublicImage
          src={item.coverImage || "/images/default-cover.svg"}
          alt={item.title}
          width={800}
          height={420}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      </Link>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm muted">
          {item.category && <span>{item.category.name}</span>}
          <span>{item.viewCount} 浏览</span>
          <span>{item.favoriteCount} 收藏</span>
        </div>
        <Link href={`/contents/${item.slug}`} className="text-lg font-semibold">
          {item.title}
        </Link>
        <p className="line-clamp-2 text-sm muted">{item.summary}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 3).map(({ tag }) => (
              <span key={tag.id} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs muted">
                {tag.name}
              </span>
            ))}
          </div>
          <FavoriteButton contentId={item.id} />
        </div>
      </div>
    </article>
  );
}
