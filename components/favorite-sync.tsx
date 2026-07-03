"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const key = "fy_guest_favorites";

export function FavoriteSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const contentIds = JSON.parse(raw || "[]") as string[];
    if (!contentIds.length) return;
    fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentIds })
    }).then((res) => {
      if (res.ok) localStorage.removeItem(key);
    });
  }, [session]);

  return null;
}
