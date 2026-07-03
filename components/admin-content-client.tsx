"use client";

import { ContentStatus, type Category, type Content, type ContentTag, type Tag } from "@prisma/client";
import { useState } from "react";

type AdminContent = Content & { category: Category | null; tags: (ContentTag & { tag: Tag })[] };

export function AdminContentClient({
  contents,
  categories,
  tags
}: {
  contents: AdminContent[];
  categories: Category[];
  tags: Tag[];
}) {
  const [items, setItems] = useState(contents);
  const [message, setMessage] = useState("");

  async function create(formData: FormData) {
    const tagIds = tags
      .filter((tag) => formData.getAll("tagIds").includes(tag.id))
      .map((tag) => tag.id);
    const res = await fetch("/api/admin/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug"),
        summary: formData.get("summary"),
        content: formData.get("content"),
        coverImage: formData.get("coverImage") || "/images/default-cover.svg",
        categoryId: formData.get("categoryId") || null,
        status: formData.get("status"),
        isFeatured: formData.get("isFeatured") === "on",
        isPinned: formData.get("isPinned") === "on",
        tagIds
      })
    });
    const body = await res.json();
    setMessage(res.ok ? "内容已创建" : body.error?.message || "创建失败");
    if (res.ok) location.reload();
  }

  async function updateStatus(id: string, status: ContentStatus) {
    const item = items.find((content) => content.id === id);
    if (!item) return;
    const res = await fetch(`/api/admin/contents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        content: item.content,
        coverImage: item.coverImage,
        categoryId: item.categoryId,
        status,
        isFeatured: item.isFeatured,
        isPinned: item.isPinned,
        tagIds: item.tags.map(({ tag }) => tag.id)
      })
    });
    if (res.ok) setItems((old) => old.map((content) => (content.id === id ? { ...content, status } : content)));
  }

  async function remove(id: string) {
    if (!confirm("确认删除该内容？")) return;
    const res = await fetch(`/api/admin/contents/${id}`, { method: "DELETE" });
    if (res.ok) setItems((old) => old.filter((item) => item.id !== id));
    else alert("删除失败");
  }

  return (
    <div className="grid gap-5">
      <h2 className="text-2xl font-semibold">内容管理</h2>
      <form action={create} className="card grid gap-3 p-5">
        <h3 className="font-semibold">创建内容</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" name="title" placeholder="标题" required />
          <input className="input" name="slug" placeholder="英文别名，如 nextjs-guide" required />
          <input className="input md:col-span-2" name="summary" placeholder="简介" required />
          <input className="input md:col-span-2" name="coverImage" placeholder="封面地址" />
          <select className="input" name="categoryId">
            <option value="">不选择分类</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select className="input" name="status" defaultValue="DRAFT">
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">发布</option>
            <option value="OFFLINE">下架</option>
            <option value="HIDDEN">隐藏</option>
          </select>
          <textarea className="input min-h-32 md:col-span-2" name="content" placeholder="正文内容" required />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2">
              <input type="checkbox" name="tagIds" value={tag.id} />
              {tag.name}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" /> 推荐</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isPinned" /> 置顶</label>
        <button className="btn btn-primary">保存内容</button>
        {message && <p>{message}</p>}
      </form>
      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-2">标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>收藏</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3">{item.title}</td>
                <td>{item.category?.name || "-"}</td>
                <td>{item.status}</td>
                <td>{item.favoriteCount}</td>
                <td className="flex gap-2 py-2">
                  <a className="btn" href={`/contents/${item.slug}`} target="_blank">预览</a>
                  <button className="btn" onClick={() => updateStatus(item.id, "PUBLISHED")}>发布</button>
                  <button className="btn" onClick={() => updateStatus(item.id, "OFFLINE")}>下架</button>
                  <button className="btn" onClick={() => remove(item.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
