import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/security";

const useSecureCookies = (process.env.NEXTAUTH_URL || "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "邮箱登录",
      credentials: {
        account: { label: "账号或邮箱", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const account = parsed.data.account.toLowerCase();
        const key = `login:${account}`;
        if (!checkRateLimit(key, 6, 15 * 60_000)) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: account }, { nickname: parsed.data.account }]
          }
        });
        if (!user || user.status !== UserStatus.ACTIVE) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          image: user.avatar,
          role: user.role,
          status: user.status
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies
      }
    }
  }
};
