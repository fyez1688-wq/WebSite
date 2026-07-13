"use client";

import { ChevronDown, Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
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
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] max-w-sm sm:bottom-5 sm:right-5">
      {!isMiniPlayerOpen ? (
        current ? (
          <button
            className="btn btn-primary ml-auto size-11 rounded-full p-0 shadow-lg"
            onClick={openMiniPlayer}
            aria-label="展开音乐播放器"
            title={current.title}
          >
            <Music2 className="size-5" />
          </button>
        ) : null
      ) : (
        <section className="card p-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current?.title || "未选择歌曲"}</p>
              <p className="truncate text-xs muted">{current?.artist || "点击歌曲卡片开始播放"}</p>
            </div>
            <button className="btn size-9 p-0" onClick={closeMiniPlayer} aria-label="收起音乐播放器">
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button className="btn size-9 p-0" onClick={previous} disabled={!current} aria-label="上一首">
              <SkipBack className="size-4" />
            </button>
            <button className="btn btn-primary size-10 p-0" onClick={toggle} disabled={!current} aria-label="播放或暂停">
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button className="btn size-9 p-0" onClick={next} disabled={!current} aria-label="下一首">
              <SkipForward className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(progress, Math.max(duration, 1))}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="播放进度"
            />
            <div className="flex justify-between text-xs muted">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs muted">
            <Volume2 className="size-4" />
            <input
              className="min-w-0 flex-1"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="音量"
            />
          </label>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </section>
      )}
    </div>
  );
}
