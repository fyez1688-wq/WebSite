"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

const key = "fy_guest_favorites";

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}

export function FavoriteButton({ contentId, initial = false }: { contentId: string; initial?: boolean }) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(() => {
    if (typeof window === "undefined") return initial;
    return initial || readLocal().includes(contentId);
  });
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    const next = !favorited;
    setFavorited(next);
    setLoading(true);
    try {
      if (!session) {
        const list = new Set(readLocal());
        if (next) list.add(contentId);
        else list.delete(contentId);
        localStorage.setItem(key, JSON.stringify([...list]));
      } else {
        const res = await fetch("/api/favorites", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId })
        });
        if (!res.ok) throw new Error("操作失败");
      }
    } catch {
      setFavorited(!next);
      alert("收藏操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn size-10 p-0" onClick={toggle} disabled={loading} aria-label="收藏">
      <Heart className="size-5" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
