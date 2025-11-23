import type { Image } from 'sanity';

export type DayImage = (Image & { alt?: string }) | null;

export type DayMediaItem = {
  _key?: string;
  title: string;
  image?: DayImage;
  url: string;
};

export type DayEntry = {
  date: string;
  items: DayMediaItem[];
};
