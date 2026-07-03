import type { Metadata } from "next";

export const metadata: Metadata = { title: "忘记密码" };

export default function ForgotPasswordPage() {
  return (
    <main className="container py-8">
      <div className="card mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold">忘记密码</h1>
        <p className="mt-3 muted">密码重置令牌表和基础结构已预留。正式接入邮件服务后可发送重置链接。</p>
      </div>
    </main>
  );
}
