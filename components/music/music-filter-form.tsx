"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

export function MusicFilterForm({
  categories,
  initialCategory,
  initialQuery
}: {
  categories: Array<string | null>;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = formData.get("q")?.toString().trim();
    const category = formData.get("category")?.toString().trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    const suffix = params.toString();
    router.push(suffix ? `/music?${suffix}` : "/music", { scroll: false });
  }

  return (
    <form onSubmit={submitFilters} className="filter-panel mt-7 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto] md:p-5">
      <label className="flex h-[42px] min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]">
        <Search className="pointer-events-none size-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          name="q"
          defaultValue={initialQuery}
          placeholder="搜索歌曲名、作者或专辑"
        />
      </label>
      <select className="input" name="category" defaultValue={initialCategory || ""}>
        <option value="">全部分类</option>
        {categories.map((category) => (
          <option key={category} value={category || ""}>
            {category}
          </option>
        ))}
      </select>
      <button className="btn btn-primary"><SlidersHorizontal className="size-4" />筛选</button>
    </form>
  );
}
