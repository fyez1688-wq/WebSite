"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder?: number;
};

export function AdminTaxonomyClient({
  title,
  endpoint,
  hasSort,
  initialItems
}: {
  title: string;
  endpoint: string;
  hasSort?: boolean;
  initialItems: TaxonomyItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TaxonomyItem | null>(null);
  const [pendingMerge, setPendingMerge] = useState<TaxonomyItem | null>(null);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const canMerge = endpoint.includes("tags");

  async function create(formData: FormData) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        slug: formData.get("slug"),
        description: formData.get("description") || null,
        sortOrder: Number(formData.get("sortOrder") || 0)
      })
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error?.message || "创建失败");
      return;
    }
    setItems((old) => [...old, body.data.item]);
    setMessage("已创建");
  }

  async function update(id: string, formData: FormData) {
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        slug: formData.get("slug"),
        description: formData.get("description") || null,
        sortOrder: Number(formData.get("sortOrder") || 0)
      })
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error?.message || "更新失败");
      return;
    }
    setItems((old) => old.map((item) => (item.id === id ? body.data.item : item)));
    setEditing(null);
    setMessage("已保存");
  }

  async function remove(id: string, moveToCategoryId?: string) {
    if (!confirm(moveToCategoryId ? "确认移动关联内容并删除该分类？" : "确认删除？")) return;
    const res = await fetch(`${endpoint}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: moveToCategoryId ? JSON.stringify({ moveToCategoryId }) : undefined
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setItems((old) => old.filter((item) => item.id !== id));
      setPendingDelete(null);
      setMoveTargetId("");
      setMessage(body?.message || "已删除");
      return;
    }
    if (body?.error?.code === "CATEGORY_IN_USE" && endpoint.includes("categories")) {
      const item = items.find((entry) => entry.id === id);
      if (item) {
        setPendingDelete(item);
        setMoveTargetId(items.find((entry) => entry.id !== id)?.id || "");
      }
    }
    setMessage(body?.error?.message || "删除失败");
  }

  async function merge(sourceId: string, targetTagId: string) {
    if (!targetTagId) {
      setMessage("请选择目标标签");
      return;
    }
    if (!confirm("确认合并标签？源标签会被删除，内容关联会移动到目标标签。")) return;
    const res = await fetch(`${endpoint}/${sourceId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTagId })
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(body?.error?.message || "合并失败");
      return;
    }
    setItems((old) => old.filter((item) => item.id !== sourceId));
    setPendingMerge(null);
    setMergeTargetId("");
    setMessage(body?.message || "标签已合并");
  }

  return (
    <div className="admin-stack">
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">内容组织</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>
        {message && <span className="status-pill">{message}</span>}
      </div>
      <form action={create} className="admin-panel grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto]">
        <input className="input" name="name" placeholder="名称" required />
        <input className="input" name="slug" placeholder="英文别名" required />
        <input className="input" name="description" placeholder="描述" />
        {hasSort && <input className="input" name="sortOrder" type="number" min={0} placeholder="排序" />}
        <button className="btn btn-primary">
          <Plus className="size-4" />
          新增
        </button>
      </form>
      <div className="admin-panel overflow-x-auto">
        {pendingDelete && (
          <div className="mb-4 grid gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_260px_auto_auto]">
            <div>
              <p className="font-medium">移动内容后删除：{pendingDelete.name}</p>
              <p className="text-sm muted">该分类下仍有关联内容，请选择目标分类。移动完成后会删除原分类。</p>
            </div>
            <select className="input" value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)}>
              {items.filter((item) => item.id !== pendingDelete.id).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" disabled={!moveTargetId} onClick={() => remove(pendingDelete.id, moveTargetId)}>
              移动并删除
            </button>
            <button type="button" className="btn" onClick={() => { setPendingDelete(null); setMoveTargetId(""); }}>
              取消
            </button>
          </div>
        )}
        {pendingMerge && canMerge && (
          <div className="mb-4 grid gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_260px_auto_auto]">
            <div>
              <p className="font-medium">合并标签：{pendingMerge.name}</p>
              <p className="text-sm muted">源标签会被删除，已关联内容会移动到目标标签，重复关联会自动跳过。</p>
            </div>
            <select className="input" value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}>
              {items.filter((item) => item.id !== pendingMerge.id).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" disabled={!mergeTargetId} onClick={() => merge(pendingMerge.id, mergeTargetId)}>
              合并标签
            </button>
            <button type="button" className="btn" onClick={() => { setPendingMerge(null); setMergeTargetId(""); }}>
              取消
            </button>
          </div>
        )}
        <table className="admin-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>别名</th>
              <th>描述</th>
              {hasSort && <th>排序</th>}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {editing === item.id ? (
                  <EditableRow item={item} hasSort={hasSort} onCancel={() => setEditing(null)} onSave={update} />
                ) : (
                  <>
                    <td>{item.name}</td>
                    <td className="muted">{item.slug}</td>
                    <td className="muted">{item.description || "-"}</td>
                    {hasSort && <td>{item.sortOrder || 0}</td>}
                    <td>
                      <div className="flex gap-2">
                        <button className="btn size-9 p-0" onClick={() => setEditing(item.id)} title="编辑">
                          <Pencil className="size-4" />
                        </button>
                        {canMerge && (
                          <button
                            className="btn px-3"
                            onClick={() => {
                              setPendingMerge(item);
                              setMergeTargetId(items.find((entry) => entry.id !== item.id)?.id || "");
                            }}
                            title="合并"
                            disabled={items.length < 2}
                          >
                            合并
                          </button>
                        )}
                        <button className="btn size-9 p-0" onClick={() => remove(item.id)} title="删除">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableRow({
  item,
  hasSort,
  onCancel,
  onSave
}: {
  item: TaxonomyItem;
  hasSort?: boolean;
  onCancel: () => void;
  onSave: (id: string, formData: FormData) => Promise<void>;
}) {
  return (
    <td colSpan={hasSort ? 5 : 4}>
      <form action={(formData) => onSave(item.id, formData)} className="grid gap-2 md:grid-cols-[1fr_1fr_1.5fr_auto_auto]">
        <input className="input" name="name" defaultValue={item.name} />
        <input className="input" name="slug" defaultValue={item.slug} />
        <input className="input" name="description" defaultValue={item.description || ""} />
        {hasSort && <input className="input" name="sortOrder" type="number" defaultValue={item.sortOrder || 0} />}
        <button className="btn btn-primary size-10 p-0" title="保存">
          <Save className="size-4" />
        </button>
        <button type="button" className="btn size-10 p-0" onClick={onCancel} title="取消">
          <X className="size-4" />
        </button>
      </form>
    </td>
  );
}
