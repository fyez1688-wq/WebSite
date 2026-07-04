"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import type { MusicTrackItem } from "@/components/music/music-types";
import { useMusicPlayer } from "@/components/music/music-player";

export function MusicCard({
  track,
  queue,
  compact = false
}: {
  track: MusicTrackItem;
  queue: MusicTrackItem[];
  compact?: boolean;
}) {
  const { current, isPlaying, playTrack, toggle } = useMusicPlayer();
  const active = current?.id === track.id;

  function onPlay() {
    if (active) toggle();
    else playTrack(track, queue);
  }

  return (
    <article className={`card overflow-hidden ${compact ? "grid grid-cols-[88px_1fr] sm:block" : ""}`}>
      <Image
        src={track.coverImage || "/images/default-cover.svg"}
        alt={track.title}
        width={640}
        height={360}
        className={compact ? "h-full min-h-24 w-full object-cover sm:aspect-video" : "aspect-video w-full object-cover"}
        loading="lazy"
      />
      <div className="grid min-w-0 gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{track.title}</h3>
          <p className="truncate text-sm muted">{track.artist || "未知作者"}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs muted">{track.category || track.album || "背景音乐"}</span>
          <button className="btn size-10 shrink-0 p-0" onClick={onPlay} aria-label={active && isPlaying ? "暂停" : "播放"}>
            {active && isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
