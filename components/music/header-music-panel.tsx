"use client";

import Link from "next/link";
import { ArrowDownUp, Heart, ListMusic, LoaderCircle, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type MusicPlayMode, useMusicPlayer } from "@/components/music/music-player-context";
import type { MusicTrackItem } from "@/components/music/music-types";

type LoadState = "idle" | "loading" | "ready" | "error";

export function HeaderMusicPanel({ onClose }: { onClose: () => void }) {
  const { current, isPlaying, next, previous, playMode, playTrack, setPlayMode, toggle } = useMusicPlayer();
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const playModeOptions: MusicPlayMode[] = ["repeat-all", "repeat-one", "order"];
  const playModeLabel = {
    "repeat-all": "列表循环",
    "repeat-one": "单曲循环",
    order: "顺序播放"
  } satisfies Record<MusicPlayMode, string>;
  const PlayModeIcon = playMode === "repeat-one" ? Repeat1 : playMode === "order" ? ArrowDownUp : Repeat;

  function cyclePlayMode() {
    const currentIndex = playModeOptions.indexOf(playMode);
    setPlayMode(playModeOptions[(currentIndex + 1) % playModeOptions.length]);
  }

  useEffect(() => {
    const controller = new AbortController();
    const loadTracks = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(body?.data?.items)) throw new Error("音乐加载失败");
      return body.data.items as MusicTrackItem[];
    };

    void (async () => {
      try {
        const featuredTracks = await loadTracks("/api/music/featured");
        const tracks = featuredTracks.length ? featuredTracks : await loadTracks("/api/music?pageSize=8");
        if (!tracks.length) {
          setLoadState("idle");
          return;
        }
        setLoadState("ready");
        if (!current) playTrack(tracks[0], tracks);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState("error");
      }
    })();

    return () => controller.abort();
    // This panel mounts only after the header music button is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="fixed right-4 top-[76px] z-50 w-[calc(100vw-32px)] max-w-[360px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-md"
      role="dialog"
      aria-label="音乐播放器"
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="text-xs font-medium muted">音乐队列</p>
        <button className="btn size-8 rounded-full p-0" onClick={onClose} aria-label="关闭音乐面板">
          <X className="size-4" />
        </button>
      </div>

      <div className="px-4 pb-2 pt-1">
        <p className="truncate text-sm font-semibold">{current?.title || (loadState === "loading" ? "正在准备推荐歌曲" : loadState === "idle" ? "暂无音乐" : "请选择一首歌曲")}</p>
        <p className={`truncate text-xs ${loadState === "error" ? "text-red-500" : "muted"}`}>{current?.artist || (loadState === "error" ? "音乐加载失败，请稍后再试" : loadState === "idle" ? "可去后台添加后显示在这里" : "首次打开会默认选择首页推荐")}</p>
      </div>

      <div className="flex items-center justify-center gap-1 border-y border-[var(--border)] px-3 py-2">
        <Link className="btn size-11 rounded-full p-0" href="/music" onClick={onClose} aria-label="查看歌曲列表" title="查看全部音乐">
          <ListMusic className="size-5" />
        </Link>
        <button className="btn size-11 rounded-full p-0" onClick={previous} disabled={!current} aria-label="上一首">
          <SkipBack className="size-5" />
        </button>
        <button className="btn btn-primary size-12 rounded-full p-0" onClick={toggle} disabled={!current} aria-label={isPlaying ? "暂停" : "播放"}>
          {isPlaying ? <Pause className="size-6" /> : <Play className="size-6" />}
        </button>
        <button className="btn size-11 rounded-full p-0" onClick={next} disabled={!current} aria-label="下一首">
          <SkipForward className="size-5" />
        </button>
        <button className="btn size-11 rounded-full p-0" onClick={cyclePlayMode} aria-label={`播放模式：${playModeLabel[playMode]}，点击切换`} title={`播放模式：${playModeLabel[playMode]}`}>
          <PlayModeIcon className="size-5" />
        </button>
        <button className="btn size-11 rounded-full p-0" disabled aria-label="收藏功能待完善" title="收藏功能待完善">
          <Heart className="size-5" />
        </button>
      </div>

      {loadState === "loading" && <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs muted"><LoaderCircle className="size-3.5 animate-spin" />正在加载音乐</div>}

      <div className="border-t border-[var(--border)] px-3 py-2 text-center">
        <Link className="inline-flex items-center gap-1 text-xs muted transition hover:text-[var(--foreground)]" href="/music" onClick={onClose}>
          <ListMusic className="size-3.5" />查看全部音乐
        </Link>
      </div>
    </section>
  );
}
