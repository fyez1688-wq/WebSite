"use client";

import Link from "next/link";
import { ChevronDown, Heart, ListMusic, Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "@/components/music/music-player-context";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function MiniPlayer() {
  const {
    current,
    isPlaying,
    toggle,
    next,
    previous,
    volume,
    setVolume,
    progress,
    duration,
    seek,
    error,
    isMiniPlayerOpen,
    openMiniPlayer,
    closeMiniPlayer
  } = useMusicPlayer();

  return (
    <div className="fixed bottom-3 right-3 z-50 w-[calc(100vw-24px)] max-w-[620px] sm:bottom-4 sm:right-4">
      {!isMiniPlayerOpen ? (
        current ? (
          <button
            className="btn btn-primary ml-auto size-10 rounded-full p-0 shadow-sm"
            onClick={openMiniPlayer}
            aria-label="展开音乐播放器"
            title={current.title}
          >
            <Music2 className="size-5" />
          </button>
        ) : null
      ) : (
        <section className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <input
            className="absolute inset-x-0 top-0 z-10 h-1 w-full cursor-pointer accent-[var(--primary)]"
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={Math.min(progress, Math.max(duration, 1))}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="播放进度"
          />
          <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 pt-1 sm:h-[68px] sm:px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current?.title || "未选择歌曲"}</p>
              <p className="truncate text-xs muted">{current?.artist || "从音乐列表选择歌曲"}</p>
            </div>
            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
              <Link className="btn size-8 rounded-full p-0" href="/music" aria-label="查看歌曲列表" title="查看歌曲列表">
                <ListMusic className="size-4" />
              </Link>
              <button className="btn size-8 rounded-full p-0" onClick={previous} disabled={!current} aria-label="上一首">
                <SkipBack className="size-4" />
              </button>
              <button className="btn btn-primary size-10 rounded-full p-0" onClick={toggle} disabled={!current} aria-label="播放或暂停">
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button className="btn size-8 rounded-full p-0" onClick={next} disabled={!current} aria-label="下一首">
                <SkipForward className="size-4" />
              </button>
              <button className="btn size-8 rounded-full p-0" disabled aria-label="收藏功能待完善" title="收藏功能待完善">
                <Heart className="size-4" />
              </button>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="hidden text-xs muted sm:inline">{formatTime(progress)} / {formatTime(duration)}</span>
              <label className="hidden items-center gap-1.5 text-xs muted lg:flex">
                <Volume2 className="size-4" />
                <input
                  className="w-20"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="音量"
                />
              </label>
              <button className="btn size-8 rounded-full p-0" onClick={closeMiniPlayer} aria-label="收起音乐播放器">
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
          {error && <p className="border-t border-[var(--border)] px-3 py-1 text-xs text-red-500">{error}</p>}
        </section>
      )}
    </div>
  );
}
