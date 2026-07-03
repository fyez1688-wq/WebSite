"use client";

import type { Announcement } from "@prisma/client";
import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

export function AdminAnnouncementClient({ initialItems }: { initialItems: Announcement[] }) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");

  async function create(formData: FormData) {
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        content: formData.get("content"),
        isActive: true
      })
    });
    const body = await res.json();
    if (res.ok) setItems((old) => [body.data.item, ...old]);
    setMessage(res.ok ? "公告已创建" : body.error?.message || "创建失败");
  }

  async function patch(id: string, data: Partial<Announcement>) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (res.ok) setItems((old) => old.map((item) => (item.id === id ? body.data.item : item)));
    setMessage(res.ok ? "已更新" : body.error?.message || "更新失败");
  }

  async function remove(id: string) {
    if (!confirm("确认删除该公告？")) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) setItems((old) => old.filter((item) => item.id !== id));
    else setMessage("删除失败");
  }

  return (
    <div className="admin-stack">
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">首页运营</p>
          <h2 className="text-2xl font-semibold">公告管理</h2>
        </div>
        {message && <span className="status-pill">{message}</span>}
      </div>
      <form action={create} className="admin-panel grid gap-3">
        <input className="input" name="title" placeholder="公告标题" required />
        <textarea className="input min-h-24 py-3" name="content" placeholder="公告内容" required />
        <button className="btn btn-primary w-fit">
          <Plus className="size-4" />
          新增公告
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
              <p className="mt-2 text-sm muted">{item.content}</p>
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
