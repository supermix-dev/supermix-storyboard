import Image from 'next/image';
import Link from 'next/link';

import { Heading2 } from '@/components/ui/heading2';
import { Heading4 } from '@/components/ui/heading4';
import { getHostname, getImageAlt } from '@/lib/helpers';
import { getDay } from '@/sanity/lib/data';
import { buildImageUrl } from '@/sanity/lib/image';
import type { DayEntry, DayMediaItem } from '@/types/day';

export default async function Day({
  label,
  date,
}: {
  label: string;
  date: string;
}) {
  const day: DayEntry | null = await getDay(date);

  return (
    <div className="w-full flex flex-col gap-4">
      <Heading2>{label}</Heading2>
      <div className="grid w-full items-start gap-8">
        <div className="flex flex-col gap-6">
          {day?.items?.map((item) => (
            <MediaCard key={item._key ?? item.url} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaCard({ title, image, url }: DayMediaItem) {
  const imageUrl = buildImageUrl(image, 960, 540);
  const altText = getImageAlt(title, image?.alt);

  return (
    <Link
      href={url}
      className="group flex md:flex-row flex-col gap-4 transition"
      target="_blank"
      rel="noreferrer"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={altText}
          width={960}
          height={540}
          className="aspect-video w-full rounded object-cover lg:w-56"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-xs font-medium text-muted-foreground lg:w-56">
          Thumbnail coming soon
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-sm">
        <Heading4>{title}</Heading4>
        <span className="group-hover:underline text-sm text-muted-foreground">
          {getHostname(url)}
        </span>
      </div>
    </Link>
  );
}
