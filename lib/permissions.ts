import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/response";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.status !== UserStatus.ACTIVE) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await getCurrentSession();
  if (
    !session?.user ||
    session.user.status !== UserStatus.ACTIVE ||
    session.user.role !== UserRole.ADMIN
  ) {
    redirect("/403");
  }
  return session;
}

export async function requireUserApi() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.status !== UserStatus.ACTIVE) {
    return { session: null, response: fail("UNAUTHORIZED", "请先登录", 401) };
  }
  return { session, response: null };
}

export async function requireAdminApi() {
  const session = await getCurrentSession();
  if (
    !session?.user ||
    session.user.status !== UserStatus.ACTIVE ||
    session.user.role !== UserRole.ADMIN
  ) {
    return { session: null, response: fail("FORBIDDEN", "没有管理员权限", 403) };
  }
  return { session, response: null };
}
