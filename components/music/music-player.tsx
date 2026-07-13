"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicTrackItem } from "@/components/music/music-types";
import { MusicPlayerContext } from "@/components/music/music-player-context";

const playbackErrorMessage = "音频链接可能已失效或暂时无法播放，请稍后再试";

function isAutoplayBlocked(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countedRef = useRef<string | null>(null);
  const [queue, setQueue] = useState<MusicTrackItem[]>([]);
  const [current, setCurrent] = useState<MusicTrackItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.72);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [isMiniPlayerOpen, setMiniPlayerOpen] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime || 0);
    const onLoaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      setIsPlaying(false);
      move(1, true);
    };
    const onError = () => {
      setError(playbackErrorMessage);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setError("");
    setProgress(0);
    setDuration(0);
    audio.src = current.audioUrl;
    audio.load();
    if (isPlaying) {
      audio.play().catch((error: unknown) => {
        if (isAutoplayBlocked(error)) {
          setIsPlaying(false);
          return;
        }
        setError(playbackErrorMessage);
        setIsPlaying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (!current || !isPlaying || countedRef.current === current.id) return;
    countedRef.current = current.id;
    fetch(`/api/music/${current.id}/play`, { method: "POST" }).catch(() => undefined);
  }, [current, isPlaying]);

  function playTrack(track: MusicTrackItem, nextQueue?: MusicTrackItem[]) {
    setError("");
    setQueue(nextQueue?.length ? nextQueue : [track]);
    setCurrent(track);
    setIsPlaying(true);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    audio.play().catch(() => {
      setError(playbackErrorMessage);
      setIsPlaying(false);
    });
  }

  function move(offset: 1 | -1, autoplay = isPlaying) {
    if (!queue.length) return;
    const currentIndex = current ? queue.findIndex((item) => item.id === current.id) : -1;
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + offset + queue.length) % queue.length;
    setCurrent(queue[nextIndex]);
    setIsPlaying(autoplay);
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress(value);
  }

  const context = {
    queue,
    current,
    isPlaying,
    volume,
    progress,
    duration,
    error,
    isMiniPlayerOpen,
    openMiniPlayer: () => setMiniPlayerOpen(true),
    closeMiniPlayer: () => setMiniPlayerOpen(false),
    playTrack,
    toggle,
    next: () => move(1),
    previous: () => move(-1),
    setVolume: (value: number) => setVolumeState(Math.min(Math.max(value, 0), 1)),
    seek
  };

  return <MusicPlayerContext.Provider value={context}>{children}</MusicPlayerContext.Provider>;
}
