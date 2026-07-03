import type { Metadata } from "next";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "用户中心" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser();
  const [user, favoriteCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.favorite.count({ where: { userId: session.user.id } })
  ]);
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-semibold">用户中心</h1>
      <div className="card mt-5 p-5">
        <p>邮箱：{user.email}</p>
        <p className="mt-2">注册时间：{user.createdAt.toLocaleDateString("zh-CN")}</p>
        <p className="mt-2">收藏数量：{favoriteCount}</p>
      </div>
      <ProfileForm user={{ nickname: user.nickname, avatar: user.avatar || "" }} />
    </main>
  );
}
