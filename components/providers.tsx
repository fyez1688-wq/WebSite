"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect } from "react";
import { FavoriteSync } from "@/components/favorite-sync";
import { MusicPlayerProvider } from "@/components/music/music-player";

export function Providers({
  session,
  children
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <SessionProvider session={session}>
      <MusicPlayerProvider>
        <FavoriteSync />
        {children}
      </MusicPlayerProvider>
    </SessionProvider>
  );
}
