"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const account = String(formData.get("account") || "");
    const email = String(formData.get("email") || account);
    const password = String(formData.get("password") || "");
    const nickname = String(formData.get("nickname") || "");
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, nickname })
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || "注册失败");
      }
      const result = await signIn("credentials", { account: mode === "login" ? account : email, password, redirect: false });
      if (result?.error) throw new Error("邮箱或密码不正确");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="card mx-auto mt-8 grid w-full max-w-md gap-4 p-6">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
      {mode === "register" && <input className="input" name="nickname" placeholder="昵称" required />}
      {mode === "login" ? (
        <input className="input" name="account" placeholder="账号或邮箱" required />
      ) : (
        <input className="input" name="email" type="email" placeholder="邮箱" required />
      )}
      <label className="relative">
        <input
          className="input pr-12"
          name="password"
          type={show ? "text" : "password"}
          placeholder="密码"
          minLength={mode === "register" ? 8 : 1}
          required
        />
        <button type="button" className="absolute right-2 top-1 btn size-8 p-0" onClick={() => setShow((v) => !v)}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </label>
      {error && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
      </button>
      <div className="flex justify-between text-sm muted">
        {mode === "login" ? <Link href="/register">没有账号？去注册</Link> : <Link href="/login">已有账号？去登录</Link>}
        <Link href="/forgot-password">忘记密码</Link>
      </div>
    </form>
  );
}
