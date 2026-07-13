"use client";

import Link from "next/link";
import { ListMusic, LoaderCircle, Music2, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMusicPlayer } from "@/components/music/music-player-context";
import type { MusicTrackItem } from "@/components/music/music-types";

type LoadState = "idle" | "loading" | "ready" | "error";

export function HeaderMusicPanel({ onClose }: { onClose: () => void }) {
  const { current, isPlaying, playTrack, toggle } = useMusicPlayer();
  const [tracks, setTracks] = useState<MusicTrackItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/music?pageSize=8", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(body?.data?.items)) throw new Error("音乐加载失败");
        setTracks(body.data.items);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <section
      className="fixed right-4 top-[76px] z-50 w-[calc(100vw-32px)] max-w-sm overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl"
      role="dialog"
      aria-label="音乐播放器"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Music2 className="size-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{current?.title || "请选择一首歌曲"}</p>
            <p className="truncate text-xs muted">{current?.artist || "从下方列表开始播放"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button className="btn btn-primary size-9 rounded-full p-0" onClick={toggle} disabled={!current} aria-label={isPlaying ? "暂停" : "播放"}>
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button className="btn size-9 rounded-full p-0" onClick={onClose} aria-label="关闭音乐面板">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(50vh,360px)] overflow-y-auto p-2" aria-live="polite">
        {loadState === "loading" && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm muted">
            <LoaderCircle className="size-4 animate-spin" />正在加载音乐
          </div>
        )}
        {loadState === "error" && <p className="px-4 py-10 text-center text-sm text-red-500">音乐加载失败，请稍后再试。</p>}
        {loadState === "ready" && !tracks.length && <p className="px-4 py-10 text-center text-sm muted">暂无音乐，去后台添加后会显示在这里。</p>}
        {loadState === "ready" && tracks.map((track) => {
          const active = current?.id === track.id;
          return (
            <button
              key={track.id}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-[var(--surface-strong)] ${active ? "bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] text-[var(--primary)]" : ""}`}
              onClick={() => playTrack(track, tracks)}
              aria-label={`播放 ${track.title}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
                {active && isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{track.title}</span>
                <span className="block truncate text-xs muted">{track.artist || "未知作者"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--border)] p-2">
        <Link className="btn w-full justify-center" href="/music" onClick={onClose}>
          <ListMusic className="size-4" />查看全部音乐
        </Link>
      </div>
    </section>
  );
}
