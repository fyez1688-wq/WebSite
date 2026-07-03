"use client";

import type { Banner } from "@prisma/client";
import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

export function AdminBannerClient({ initialItems }: { initialItems: Banner[] }) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");

  async function create(formData: FormData) {
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        subtitle: formData.get("subtitle") || null,
        imageUrl: formData.get("imageUrl"),
        linkUrl: formData.get("linkUrl") || null,
        sortOrder: Number(formData.get("sortOrder") || 0),
        isActive: true
      })
    });
    const body = await res.json();
    if (res.ok) setItems((old) => [...old, body.data.item]);
    setMessage(res.ok ? "轮播图已创建" : body.error?.message || "创建失败");
  }

  async function patch(id: string, data: Partial<Banner>) {
    const res = await fetch(`/api/admin/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (res.ok) setItems((old) => old.map((item) => (item.id === id ? body.data.item : item)));
    setMessage(res.ok ? "已更新" : body.error?.message || "更新失败");
  }

  async function remove(id: string) {
    if (!confirm("确认删除该轮播图？")) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (res.ok) setItems((old) => old.filter((item) => item.id !== id));
    else setMessage("删除失败");
  }

  return (
    <div className="admin-stack">
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">首页运营</p>
          <h2 className="text-2xl font-semibold">轮播图管理</h2>
        </div>
        {message && <span className="status-pill">{message}</span>}
      </div>
      <form action={create} className="admin-panel grid gap-3 md:grid-cols-2">
        <input className="input" name="title" placeholder="标题" required />
        <input className="input" name="subtitle" placeholder="副标题" />
        <input className="input" name="imageUrl" placeholder="图片地址" required />
        <input className="input" name="linkUrl" placeholder="跳转链接" />
        <input className="input" name="sortOrder" type="number" min={0} placeholder="排序" />
        <button className="btn btn-primary">
          <Plus className="size-4" />
          新增轮播图
        </button>
      </form>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="admin-panel grid gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="status-pill">{item.isActive ? "展示中" : "已隐藏"}</span>
              </div>
              <p className="mt-1 text-sm muted">{item.subtitle || "无副标题"}</p>
              <p className="mt-2 break-all text-xs muted">{item.imageUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => patch(item.id, { isActive: !item.isActive })}>
                {item.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {item.isActive ? "隐藏" : "展示"}
              </button>
              <button className="btn size-10 p-0" onClick={() => remove(item.id)} title="删除">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
