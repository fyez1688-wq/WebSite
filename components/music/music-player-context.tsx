import { createContext, useContext } from "react";
import type { MusicTrackItem } from "@/components/music/music-types";

export type MusicPlayerContextValue = {
  queue: MusicTrackItem[];
  current: MusicTrackItem | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  error: string;
  isMiniPlayerOpen: boolean;
  openMiniPlayer: () => void;
  closeMiniPlayer: () => void;
  playTrack: (track: MusicTrackItem, queue?: MusicTrackItem[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (value: number) => void;
  seek: (value: number) => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export { MusicPlayerContext };

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return context;
}
