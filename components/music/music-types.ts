export type MusicTrackItem = {
  id: string;
  title: string;
  artist: string | null;
  album?: string | null;
  description?: string | null;
  coverImage: string | null;
  audioUrl: string;
  sourceUrl?: string | null;
  license?: string | null;
  category: string | null;
  duration: number | null;
  sortOrder?: number;
  isFeatured?: boolean;
  playCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
