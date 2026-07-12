"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Eye, FilePlus2, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { PublicImage } from "@/components/public-image";

type ContentRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: string | null;
  contentType: string;
  status: string;
  isFeatured: boolean;
  isPinned: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: { name: string } | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
};

const typeText: Record<string, string> = {
  ARTICLE: "技术文章",
  LEARNING_RESOURCE: "学习资料",
  SOFTWARE: "软件资源",
  WEBSITE: "实用网站",
  DOWNLOAD: "下载资源",
  OTHER: "其他收藏"
};

const statusText: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  OFFLINE: "已下架",
  HIDDEN: "隐藏"
};

export function AdminContentList({
  items,
  total,
  page,
  pageSize,
  totalPages,
  categories,
  tags
}: {
  items: ContentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const allChecked = items.length > 0 && items.every((item) => selected.has(item.id));

  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    router.push(`/admin/content?${next.toString()}`);
  }

  async function batch(action: string) {
    if (!selected.size) return;
    if (action === "DELETE" && !confirm(`确认删除选中的 ${selected.size} 条内容？`)) return;
    const categoryId = action === "MOVE_CATEGORY" ? prompt("请输入目标分类ID") : undefined;
    const res = await fetch("/api/admin/contents/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action, categoryId })
    });
    const body = await res.json();
    if (res.ok) {
      setMessage(`成功 ${body.data.successCount} 条，失败 ${body.data.failedCount} 条`);
      setSelected(new Set());
      router.refresh();
    } else {
      setMessage(body.error?.message || "批量操作失败");
    }
  }

  async function single(id: string, action: string) {
    if (action === "DELETE" && !confirm("确认删除该内容？")) return;
    if (action === "DELETE") {
      await fetch(`/api/admin/contents/${id}`, { method: "DELETE" });
    } else {
      await fetch("/api/admin/contents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: action === "PUBLISHED" ? "PUBLISH" : "OFFLINE" })
      });
    }
    router.refresh();
  }

  return (
    <div className="admin-stack">
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">内容生产</p>
          <h2 className="text-2xl font-semibold">内容管理</h2>
        </div>
        <Link href="/admin/content/create" className="btn btn-primary">
          <FilePlus2 className="size-4" />
          新建内容
        </Link>
      </div>

      <div className="admin-panel grid gap-3 lg:grid-cols-4">
        <input className="input" placeholder="关键词搜索" defaultValue={searchParams.get("keyword") || ""} onBlur={(e) => updateQuery("keyword", e.target.value)} />
        <select className="input" value={searchParams.get("contentType") || ""} onChange={(e) => updateQuery("contentType", e.target.value)}>
          <option value="">全部类型</option>
          {Object.entries(typeText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="input" value={searchParams.get("status") || ""} onChange={(e) => updateQuery("status", e.target.value)}>
          <option value="">全部状态</option>
          {Object.entries(statusText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="input" value={searchParams.get("categoryId") || ""} onChange={(e) => updateQuery("categoryId", e.target.value)}>
          <option value="">全部分类</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="input" value={searchParams.get("tagId") || ""} onChange={(e) => updateQuery("tagId", e.target.value)}>
          <option value="">全部标签</option>
          {tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="input" value={searchParams.get("featured") || ""} onChange={(e) => updateQuery("featured", e.target.value)}>
          <option value="">推荐不限</option>
          <option value="true">已推荐</option>
          <option value="false">未推荐</option>
        </select>
        <select className="input" value={searchParams.get("pinned") || ""} onChange={(e) => updateQuery("pinned", e.target.value)}>
          <option value="">置顶不限</option>
          <option value="true">已置顶</option>
          <option value="false">未置顶</option>
        </select>
        <select className="input" value={searchParams.get("sort") || ""} onChange={(e) => updateQuery("sort", e.target.value)}>
          <option value="">创建时间从新到旧</option>
          <option value="createdAsc">创建时间从旧到新</option>
          <option value="updatedDesc">更新时间从新到旧</option>
          <option value="viewDesc">浏览量从高到低</option>
          <option value="favoriteDesc">收藏量从高到低</option>
          <option value="sortDesc">人工排序值从高到低</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="admin-panel flex flex-wrap items-center gap-2">
          <span className="status-pill">已选 {selected.size} 条</span>
          <button className="btn" onClick={() => batch("PUBLISH")}>批量发布</button>
          <button className="btn" onClick={() => batch("OFFLINE")}>批量下架</button>
          <button className="btn" onClick={() => batch("FEATURE")}>设为推荐</button>
          <button className="btn" onClick={() => batch("UNFEATURE")}>取消推荐</button>
          <button className="btn" onClick={() => batch("PIN")}>设为置顶</button>
          <button className="btn" onClick={() => batch("UNPIN")}>取消置顶</button>
          <button className="btn" onClick={() => batch("MOVE_CATEGORY")}>移动分类</button>
          <button className="btn" onClick={() => batch("DELETE")}>批量删除</button>
          {message && <span className="muted">{message}</span>}
        </div>
      )}

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(items.map((item) => item.id)) : new Set())} /></th>
              <th>封面</th>
              <th>标题</th>
              <th>类型</th>
              <th>分类/标签</th>
              <th>状态</th>
              <th>推荐</th>
              <th>置顶</th>
              <th>数据</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(item.id); else next.delete(item.id);
                  setSelected(next);
                }} /></td>
                <td>
                  <PublicImage src={item.coverImage || "/images/default-cover.svg"} alt="" width={74} height={42} className="aspect-video rounded object-cover" />
                </td>
                <td>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs muted">{item.slug}</div>
                </td>
                <td>{typeText[item.contentType] || item.contentType}</td>
                <td>
                  <div>{item.category?.name || "-"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{item.tags.map(({ tag }) => <span className="status-pill" key={tag.id}>{tag.name}</span>)}</div>
                </td>
                <td><span className="status-pill">{statusText[item.status] || item.status}</span></td>
                <td>{item.isFeatured ? <Star className="size-4 text-yellow-500" /> : "-"}</td>
                <td>{item.isPinned ? <Pin className="size-4 text-teal-600" /> : "-"}</td>
                <td className="text-xs muted">{item.viewCount} 浏览<br />{item.favoriteCount} 收藏</td>
                <td className="text-xs muted">{new Date(item.updatedAt).toLocaleString("zh-CN")}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn size-9 p-0" href={`/admin/content/${item.id}/preview`} target="_blank" title="预览"><Eye className="size-4" /></a>
                    <Link className="btn size-9 p-0" href={`/admin/content/${item.id}/edit`} title="编辑"><Pencil className="size-4" /></Link>
                    <button className="btn size-9 p-0" onClick={() => single(item.id, "PUBLISHED")} title="发布"><Copy className="size-4" /></button>
                    <button className="btn" onClick={() => single(item.id, "OFFLINE")}>下架</button>
                    <button className="btn size-9 p-0" onClick={() => single(item.id, "DELETE")} title="删除"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="py-12 text-center muted">暂无内容</div>}
      </div>

      <div className="admin-panel flex flex-wrap items-center justify-between gap-3">
        <span className="muted">共 {total} 条，第 {page} / {totalPages} 页</span>
        <div className="flex items-center gap-2">
          <select className="input w-28" value={pageSize} onChange={(e) => updateQuery("pageSize", e.target.value)}>
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} 条</option>)}
          </select>
          <button className="btn" disabled={page <= 1} onClick={() => updateQuery("page", String(page - 1))}>上一页</button>
          <button className="btn" disabled={page >= totalPages} onClick={() => updateQuery("page", String(page + 1))}>下一页</button>
        </div>
      </div>
    </div>
  );
}
