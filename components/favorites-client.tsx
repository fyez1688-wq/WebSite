"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

type FavoriteItem = {
  id: string;
  contentId: string;
  createdAt: Date;
  content: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    status: string;
    category: { name: string; slug: string } | null;
  };
};

export function FavoritesClient({ items }: { items: FavoriteItem[] }) {
  const [list, setList] = useState(items);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(
    () => list.filter((item) => item.content.title.includes(q) || item.content.summary.includes(q)),
    [list, q]
  );

  async function remove(contentId: string) {
    const res = await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId })
    });
    if (res.ok) setList((old) => old.filter((item) => item.contentId !== contentId));
    else alert("取消收藏失败");
  }

  async function batchRemove() {
    if (!selected.size || !confirm("确认取消选中的收藏？")) return;
    for (const id of selected) await remove(id);
    setSelected(new Set());
  }

  async function clearAll() {
    if (!list.length || !confirm("确认清空全部收藏？此操作不可撤销。")) return;
    for (const item of list) await remove(item.contentId);
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="card flex flex-col gap-3 p-4 md:flex-row">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索收藏" />
        <button className="btn" onClick={batchRemove}>
          批量取消
        </button>
        <button className="btn" onClick={clearAll}>
          清空收藏
        </button>
      </div>
      {filtered.length ? (
        filtered.map((item) => (
          <div key={item.id} className="card flex items-center gap-3 p-4">
            <input
              type="checkbox"
              checked={selected.has(item.contentId)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(item.contentId);
                else next.delete(item.contentId);
                setSelected(next);
              }}
            />
            <div className="min-w-0 flex-1">
              <a className="font-medium" href={`/contents/${item.content.slug}`}>
                {item.content.title}
              </a>
              <p className="truncate text-sm muted">
                {item.content.status === "PUBLISHED" ? item.content.summary : "内容已删除或下架"}
              </p>
            </div>
            <button className="btn size-10 p-0" onClick={() => remove(item.contentId)}>
              <Trash2 className="size-5" />
            </button>
          </div>
        ))
      ) : (
        <div className="card p-10 text-center muted">暂无收藏</div>
      )}
    </div>
  );
}
