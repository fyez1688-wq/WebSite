"use client";

import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";

type TrashItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  deletedAt: Date | string | null;
  updatedAt: Date | string;
};

export function AdminTrashClient({ items }: { items: TrashItem[] }) {
  const router = useRouter();

  async function restore(id: string) {
    await fetch(`/api/admin/contents/${id}/restore`, { method: "POST" });
    router.refresh();
  }

  async function purge(id: string) {
    if (!confirm("确认永久删除？该操作不可恢复。")) return;
    await fetch(`/api/admin/contents/${id}/purge`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-stack">
      <div>
        <p className="admin-kicker">内容管理</p>
        <h2 className="text-2xl font-semibold">回收站</h2>
      </div>
      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>删除时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs muted">{item.slug}</div>
                </td>
                <td>{item.status}</td>
                <td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString("zh-CN") : "-"}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn" onClick={() => restore(item.id)}><RotateCcw className="size-4" />恢复</button>
                    <button className="btn" onClick={() => purge(item.id)}><Trash2 className="size-4" />永久删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="py-12 text-center muted">回收站为空</div>}
      </div>
    </div>
  );
}
