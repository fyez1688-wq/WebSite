import Link from "next/link";
import { CalendarDays, Eye, Folder, Heart } from "lucide-react";
import type { Content, Category, ContentTag, Tag } from "@prisma/client";
import { FavoriteButton } from "@/components/favorite-button";
import { PublicImage } from "@/components/public-image";

type Item = Content & {
  category: Category | null;
  tags: (ContentTag & { tag: Tag })[];
};

export function ContentCard({ item }: { item: Item }) {
  const publishedLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(item.publishedAt || item.createdAt)
  );

  return (
    <article className="content-card card overflow-hidden">
      <Link href={`/contents/${item.slug}`} className="cover-frame group block" aria-label={`阅读 ${item.title}`}>
        <PublicImage
          src={item.coverImage || "/images/default-cover.svg"}
          alt={item.title}
          width={800}
          height={420}
          className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {!item.coverImage && <span className="cover-placeholder">学习资源</span>}
      </Link>
      <div className="grid gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted">
          {item.category && <span className="inline-flex items-center gap-1 font-medium text-[var(--primary)]"><Folder className="size-3.5" />{item.category.name}</span>}
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{publishedLabel}</span>
        </div>
        <Link href={`/contents/${item.slug}`} className="line-clamp-2 text-lg font-bold leading-snug transition-colors hover:text-[var(--primary)]">
          {item.title}
        </Link>
        <p className="line-clamp-2 min-h-10 text-sm leading-6 muted">{item.summary || "暂未填写摘要，点击查看完整内容。"}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map(({ tag }) => (
              <span key={tag.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs muted">
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs muted">
            <span className="hidden items-center gap-1 sm:inline-flex"><Eye className="size-3.5" />{item.viewCount}</span>
            <span className="hidden items-center gap-1 sm:inline-flex"><Heart className="size-3.5" />{item.favoriteCount}</span>
            <FavoriteButton contentId={item.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
