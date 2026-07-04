"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Menu, Moon, Music2, Search, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import { useMusicPlayer } from "@/components/music/music-player";

const nav = [
  { href: "/", label: "首页" },
  { href: "/contents", label: "内容" },
  { href: "/search", label: "搜索" },
  { href: "/favorites", label: "我的收藏" }
];

export function Header() {
  const { data: session } = useSession();
  const { openMiniPlayer } = useMusicPlayer();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/92 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
            FY
          </span>
          <span>FY的小站</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="btn border-transparent">
              {item.label}
            </Link>
          ))}
          {session?.user.role === "ADMIN" && (
            <Link href="/admin" className="btn border-transparent">
              后台
            </Link>
          )}
        </nav>
        <div className="hidden flex-1 justify-center lg:flex">
          <form action="/search" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 size-5 muted" />
            <input className="input pl-10" name="q" placeholder="搜索资源、文章或软件" />
          </form>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn size-10 rounded-full p-0 active:scale-95"
            onClick={openMiniPlayer}
            aria-label="打开音乐播放器"
            title="打开音乐播放器"
          >
            <Music2 className="size-5" />
          </button>
          <button className="btn size-10 p-0" onClick={toggleTheme} aria-label="切换主题">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          {session ? (
            <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}>
              <UserRound className="size-5" />
              <span className="hidden sm:inline">{session.user.name}</span>
            </button>
          ) : (
            <Link href="/login" className="btn btn-primary">
              登录
            </Link>
          )}
          <button className="btn size-10 p-0 md:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="container grid gap-2 pb-4 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="btn justify-start">
              {item.label}
            </Link>
          ))}
          {session?.user.role === "ADMIN" && (
            <Link href="/admin" className="btn justify-start">
              后台
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
