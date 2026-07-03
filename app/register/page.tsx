import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    <main className="container py-8">
      <AuthForm mode="register" />
    </main>
  );
}
