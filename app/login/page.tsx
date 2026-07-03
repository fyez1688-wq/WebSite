import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <main className="container py-8">
      <AuthForm mode="login" />
    </main>
  );
}
