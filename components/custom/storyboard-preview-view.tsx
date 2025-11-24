'use client';

import Image, { type ImageLoader } from 'next/image';
import {
  type SyntheticEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import { Button } from '@/components/ui/button';
import type { TranscriptSegment } from '@/hooks/use-storyboards';

type StoryboardPreviewViewProps = {
  storyboards: StoryboardSceneProps[];
  fileUrl: string | null;
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
};

type TimedStoryboard = StoryboardSceneProps & {
  start: number;
  end: number;
};

const formatTimestamp = (value: number | null | undefined) => {
  if (
    typeof value !== 'number' ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const formatTimeRange = (
  start: number | null | undefined,
  end: number | null | undefined
) => `${formatTimestamp(start)} → ${formatTimestamp(end)}`;

const externalImageLoader: ImageLoader = ({ src }) => src;

export function StoryboardPreviewView({
  storyboards,
  fileUrl,
  getMatchedTranscript,
}: StoryboardPreviewViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [overlayFailedIdentity, setOverlayFailedIdentity] = useState<
    string | null
  >(null);
  const [detailFailedIdentity, setDetailFailedIdentity] = useState<
    string | null
  >(null);

  const timedStoryboards = useMemo<TimedStoryboard[]>(() => {
    return storyboards
      .filter(
        (storyboard): storyboard is TimedStoryboard =>
          typeof storyboard.start === 'number' &&
          typeof storyboard.end === 'number' &&
          storyboard.end > storyboard.start
      )
      .sort((a, b) => a.start - b.start);
  }, [storyboards]);

  const untimedCount = storyboards.length - timedStoryboards.length;

  const timingMeta = useMemo(() => {
    if (timedStoryboards.length === 0) {
      return {
        minStart: 0,
        maxEnd: 0,
        totalDuration: 0,
      };
    }

    const minStart = timedStoryboards[0].start;
    const maxEnd = timedStoryboards.reduce(
      (max, storyboard) => Math.max(max, storyboard.end),
      timedStoryboards[0].end
    );

    return {
      minStart,
      maxEnd,
      totalDuration: Math.max(maxEnd - minStart, 0.1),
    };
  }, [timedStoryboards]);

  const currentStoryboard = useMemo(() => {
    if (timedStoryboards.length === 0) {
      return null;
    }

    return (
      timedStoryboards.find(
        (storyboard) =>
          currentTime >= storyboard.start && currentTime < storyboard.end
      ) ?? null
    );
  }, [currentTime, timedStoryboards]);

  const matchedTranscript = currentStoryboard
    ? getMatchedTranscript(currentStoryboard)
    : [];

  const overlayImageIdentity =
    currentStoryboard?.image_url && currentStoryboard?.id
      ? `${currentStoryboard.id}:${currentStoryboard.image_url}`
      : null;

  const shouldShowOverlayImage =
    Boolean(overlayImageIdentity) &&
    overlayFailedIdentity !== overlayImageIdentity;
  const shouldShowDetailImage =
    Boolean(overlayImageIdentity) &&
    detailFailedIdentity !== overlayImageIdentity;

  const handleOverlayImageError = () => {
    if (overlayImageIdentity) {
      setOverlayFailedIdentity(overlayImageIdentity);
    }
  };

  const handleDetailImageError = () => {
    if (overlayImageIdentity) {
      setDetailFailedIdentity(overlayImageIdentity);
    }
  };

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(event.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    setMediaDuration(event.currentTarget.duration);
  };

  const seekToStoryboard = useCallback((storyboard: TimedStoryboard) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = storyboard.start;
    // Attempt to play in case the user expects playback to resume after seeking.
    // Browsers may block autoplay without prior interaction; that's fine.
    const playPromise = video.play();
    if (playPromise instanceof Promise) {
      playPromise.catch(() => {
        video.pause();
      });
    }
  }, []);

  const renderTranscript = () => {
    if (!matchedTranscript.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No transcript is associated with this storyboard segment.
        </p>
      );
    }

    return (
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {matchedTranscript.map((segment) => (
          <div
            key={segment.id}
            className="rounded-md bg-muted/40 p-2 text-sm leading-relaxed"
          >
            {segment.speaker && (
              <span className="mr-2 font-semibold text-primary">
                {segment.speaker}:
              </span>
            )}
            {segment.text}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {fileUrl ? (
            <video
              ref={videoRef}
              src={fileUrl}
              controls
              className="h-full w-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Load or select a Shade asset to preview its media.
            </div>
          )}

          {currentStoryboard && (
            <div className="pointer-events-none overflow-hidden absolute left-4 top-4 max-w-96 w-full rounded-lg border border-white/10 bg-black/90 shadow-sm backdrop-blur-sm">
              {shouldShowOverlayImage && currentStoryboard.image_url && (
                <div className="relative w-full overflow-hidden aspect-video border border-white/10">
                  <Image
                    src={currentStoryboard.image_url}
                    alt={currentStoryboard.title}
                    fill
                    sizes="(max-width: 1024px) 80vw, 25vw"
                    className="object-cover"
                    loader={externalImageLoader}
                    unoptimized
                    onError={handleOverlayImageError}
                  />
                </div>
              )}
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-white">
                  {currentStoryboard.title}
                </p>
                <p className="text-[10px] text-white/70">
                  {formatTimeRange(
                    currentStoryboard.start,
                    currentStoryboard.end
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {timedStoryboards.length > 0 && (
          <div className="relative h-8 w-full rounded-md bg-muted/50 overflow-visible select-none">
            {timedStoryboards.map((storyboard) => {
              const rawLeft =
                ((storyboard.start - timingMeta.minStart) /
                  timingMeta.totalDuration) *
                100;
              const rawWidth =
                ((storyboard.end - storyboard.start) /
                  timingMeta.totalDuration) *
                100;
              const left = Number.isFinite(rawLeft)
                ? Math.min(Math.max(rawLeft, 0), 100)
                : 0;
              const width = Number.isFinite(rawWidth)
                ? Math.min(Math.max(rawWidth, 0.5), 100 - left)
                : 0;
              const isActive = currentStoryboard?.id === storyboard.id;

              return (
                <button
                  key={storyboard.id}
                  type="button"
                  className={`group absolute top-1 bottom-1 border-r border-background/50 transition-all ${
                    isActive
                      ? 'bg-primary z-10 ring-2 ring-primary/20 ring-offset-1'
                      : 'bg-primary/20 hover:bg-primary/40 hover:z-20'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  onClick={() => seekToStoryboard(storyboard)}
                >
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 flex-col items-center rounded bg-popover px-2 py-1 text-center text-[10px] text-popover-foreground shadow-md group-hover:flex z-50">
                    <span className="font-semibold truncate w-full">
                      {storyboard.title}
                    </span>
                    <span className="opacity-70">
                      {formatTimeRange(storyboard.start, storyboard.end)}
                    </span>
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-popover" />
                  </div>
                </button>
              );
            })}

            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.8)] z-30 transition-all duration-100 ease-linear"
              style={{
                left: `${
                  timingMeta.totalDuration > 0
                    ? ((currentTime - timingMeta.minStart) /
                        timingMeta.totalDuration) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        )}
        {fileUrl && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Click any storyboard marker to jump to that moment in the video.
            </p>
            {mediaDuration && (
              <p>
                {formatTimestamp(currentTime)} /{' '}
                {formatTimestamp(mediaDuration)}
              </p>
            )}
          </div>
        )}
      </div>

      {untimedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {untimedCount} storyboard{untimedCount === 1 ? '' : 's'} missing
          timecodes can’t appear in the preview overlay.
        </div>
      )}

      {currentStoryboard ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">
                {currentStoryboard.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimeRange(
                  currentStoryboard.start,
                  currentStoryboard.end
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seekToStoryboard(currentStoryboard)}
            >
              Jump to start
            </Button>
          </div>
          {shouldShowDetailImage && currentStoryboard.image_url && (
            <div className="mt-4 w-full relative rounded-lg border overflow-hidden aspect-video">
              <Image
                src={currentStoryboard.image_url}
                alt={currentStoryboard.title}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
                loader={externalImageLoader}
                unoptimized
                onError={handleDetailImageError}
              />
            </div>
          )}
          {renderTranscript()}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Press play or scrub the video to view storyboard details while
          previewing.
        </p>
      )}
    </div>
  );
}
