"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  nickname: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED" | "DELETED";
  createdAt: Date;
  _count: { favorites: number };
};

export function AdminUsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");

  async function patch(id: string, data: Partial<AdminUser>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (res.ok) setUsers((old) => old.map((user) => (user.id === id ? body.data.user : user)));
    setMessage(res.ok ? "已更新用户" : body.error?.message || "更新失败");
  }

  async function remove(id: string) {
    if (!confirm("确认标记删除该用户？")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((old) => old.map((user) => (user.id === id ? { ...user, status: "DELETED" } : user)));
    else setMessage("删除失败");
  }

  return (
    <div className="admin-stack">
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">权限与账号</p>
          <h2 className="text-2xl font-semibold">用户管理</h2>
        </div>
        {message && <span className="status-pill">{message}</span>}
      </div>
      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>账号</th>
              <th>角色</th>
              <th>状态</th>
              <th>收藏</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nickname}</td>
                <td className="muted">{user.email}</td>
                <td>{user.role === "ADMIN" ? "管理员" : "用户"}</td>
                <td>
                  <span className="status-pill">{statusText(user.status)}</span>
                </td>
                <td>{user._count.favorites}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" onClick={() => patch(user.id, { status: "ACTIVE" })}>
                      <UserCheck className="size-4" />
                      恢复
                    </button>
                    <button className="btn" onClick={() => patch(user.id, { status: "DISABLED" })}>
                      <UserX className="size-4" />
                      禁用
                    </button>
                    <button className="btn" onClick={() => patch(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })}>
                      <ShieldCheck className="size-4" />
                      {user.role === "ADMIN" ? "设为用户" : "设为管理员"}
                    </button>
                    <button className="btn size-10 p-0" onClick={() => remove(user.id)} title="删除">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusText(status: AdminUser["status"]) {
  if (status === "ACTIVE") return "正常";
  if (status === "DISABLED") return "已禁用";
  return "已删除";
}
