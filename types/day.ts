export type DayImage = {
  asset?: {
    _ref?: string;
    _type?: string;
  };
  alt?: string;
} | null;

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
