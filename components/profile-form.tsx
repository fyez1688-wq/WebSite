"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function ProfileForm({ user }: { user: { nickname: string; avatar: string } }) {
  const [message, setMessage] = useState("");

  async function updateProfile(formData: FormData) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: formData.get("nickname"),
        avatar: formData.get("avatar")
      })
    });
    setMessage(res.ok ? "资料已更新" : "更新失败");
  }

  async function changePassword(formData: FormData) {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword")
      })
    });
    setMessage(res.ok ? "密码已修改" : "密码修改失败");
  }

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <form action={updateProfile} className="card grid gap-4 p-5">
        <h2 className="text-xl font-semibold">修改资料</h2>
        <input className="input" name="nickname" defaultValue={user.nickname} placeholder="昵称" />
        <input className="input" name="avatar" defaultValue={user.avatar} placeholder="头像 URL" />
        <button className="btn btn-primary">保存资料</button>
      </form>
      <form action={changePassword} className="card grid gap-4 p-5">
        <h2 className="text-xl font-semibold">修改密码</h2>
        <input className="input" name="currentPassword" type="password" placeholder="当前密码" />
        <input className="input" name="newPassword" type="password" placeholder="新密码" minLength={8} />
        <button className="btn btn-primary">修改密码</button>
      </form>
      {message && <p className="md:col-span-2">{message}</p>}
      <button className="btn md:col-span-2" onClick={() => signOut({ callbackUrl: "/" })}>
        退出登录
      </button>
    </div>
  );
}
