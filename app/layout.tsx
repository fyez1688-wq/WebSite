import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "FY的小站",
    template: "%s - FY的小站"
  },
  description: "资源收藏、学习资料、技术文章、软件下载于一体",
  openGraph: {
    title: "FY的小站",
    description: "资源收藏、学习资料、技术文章、软件下载于一体",
    url: "/",
    siteName: "FY的小站",
    locale: "zh_CN",
    type: "website"
  },
  alternates: {
    canonical: "/"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers session={session}>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
