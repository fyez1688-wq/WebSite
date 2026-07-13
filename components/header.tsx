"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Menu, Moon, Music2, Search, Sun, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMusicPlayer } from "@/components/music/music-player-context";

const nav = [
  { href: "/", label: "首页" },
  { href: "/contents", label: "内容" },
  { href: "/search", label: "搜索" },
  { href: "/favorites", label: "我的收藏" }
];

export function Header() {
  const { data: session } = useSession();
  const { openMiniPlayer } = useMusicPlayer();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/92 shadow-[0_1px_0_rgb(15_35_25/3%)] backdrop-blur-xl">
      <div className="container flex h-[68px] items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold" aria-label="FY的小站首页">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--primary)] text-sm font-extrabold text-[var(--primary-foreground)] shadow-sm">
            FY
          </span>
          <span className="hidden text-[15px] sm:inline">FY的小站</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`btn min-h-9 border-transparent px-3 text-sm ${pathname === item.href ? "bg-[var(--surface-strong)] font-semibold text-[var(--primary)]" : ""}`}>
              {item.label}
            </Link>
          ))}
          {session?.user.role === "ADMIN" && (
            <Link href="/admin" className={`btn min-h-9 border-transparent px-3 text-sm ${pathname.startsWith("/admin") ? "bg-[var(--surface-strong)] font-semibold text-[var(--primary)]" : ""}`}>
              后台
            </Link>
          )}
        </nav>
        <div className="hidden flex-1 justify-center lg:flex">
          <form action="/search" className="relative w-full max-w-[330px]">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--card)] py-0 pl-12 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
              name="q"
              placeholder="搜索资源、文章或软件"
            />
          </form>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            className="btn size-10 rounded-full border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] p-0 text-[var(--primary)] active:scale-95"
            onClick={openMiniPlayer}
            aria-label="打开音乐播放器"
            title="打开音乐播放器"
          >
            <Music2 className="size-5" />
          </button>
          <button className="btn size-10 rounded-full p-0" onClick={toggleTheme} aria-label="切换主题" title="切换主题">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          {session ? (
            <button className="btn min-h-10 px-3" onClick={() => signOut({ callbackUrl: "/" })}>
              <UserRound className="size-5" />
              <span className="hidden sm:inline">{session.user.name}</span>
            </button>
          ) : (
            <Link href="/login" className="btn btn-primary min-h-10 px-3 sm:px-4">
              登录
            </Link>
          )}
          <button className="btn size-10 rounded-full p-0 md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "关闭导航" : "打开导航"} aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--card)]/96 shadow-lg backdrop-blur md:hidden">
          <div className="container grid gap-1 py-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`btn justify-start ${pathname === item.href ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] text-[var(--primary)]" : ""}`}>
              {item.label}
            </Link>
          ))}
          {session?.user.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setOpen(false)} className="btn justify-start">
              后台
            </Link>
          )}
          </div>
        </div>
      )}
    </header>
  );
}
