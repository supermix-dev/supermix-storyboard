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
import { Fullscreen, Minimize, Pause, Play, X } from 'lucide-react';

type StoryboardPreviewViewProps = {
  storyboards: StoryboardSceneProps[];
  fileUrl: string | null;
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
  onUpdateNotes?: (storyboardId: string, notes: string) => void;
  onExitPreview?: () => void;
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

type TimelineScrubberProps = {
  timedStoryboards: TimedStoryboard[];
  timingMeta: {
    minStart: number;
    maxEnd: number;
    totalDuration: number;
  };
  currentStoryboard: TimedStoryboard | null;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  mediaDuration: number | null;
  onSeekToStoryboard: (storyboard: TimedStoryboard) => void;
  overlayMode: 'corner' | 'fullscreen';
  onToggleOverlayMode: () => void;
};

function TimelineScrubber({
  timedStoryboards,
  timingMeta,
  currentStoryboard,
  currentTime,
  isPlaying,
  onTogglePlayPause,
  mediaDuration,
  onSeekToStoryboard,
  overlayMode,
  onToggleOverlayMode,
}: TimelineScrubberProps) {
  if (timedStoryboards.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 select-none">
      {/* Unified Control Bar with Timeline */}
      <div className="flex items-center gap-3 bg-black/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePlayPause}
          className="text-white hover:bg-white/10 h-10 w-10 p-0 flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="size-4.5" />
          ) : (
            <Play className="size-4.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleOverlayMode}
          className="text-white hover:bg-white/10 h-10 w-10 p-0 flex-shrink-0"
          title={
            overlayMode === 'corner' ? 'Fullscreen overlay' : 'Corner overlay'
          }
        >
          {overlayMode === 'corner' ? (
            <Fullscreen className="size-4.5" />
          ) : (
            <Minimize className="size-4.5" />
          )}
        </Button>

        {/* Timeline Scrubber */}
        <div className="relative h-12 flex-1 overflow-visible min-w-0">
          {timedStoryboards.map((storyboard) => {
            const rawLeft =
              ((storyboard.start - timingMeta.minStart) /
                timingMeta.totalDuration) *
              100;
            const rawWidth =
              ((storyboard.end - storyboard.start) / timingMeta.totalDuration) *
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
                className={`group absolute top-1 bottom-1 border-r border-background/50 transition-colors ${
                  isActive
                    ? 'bg-primary z-10 ring-2 ring-primary/20 ring-offset-1'
                    : 'bg-primary/20 hover:bg-primary/40 hover:z-20'
                }`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                onClick={() => onSeekToStoryboard(storyboard)}
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

        <div className="text-xs text-white/90 font-mono flex-shrink-0 min-w-[80px] text-right">
          {formatTimestamp(currentTime)} / {formatTimestamp(mediaDuration)}
        </div>
      </div>
    </div>
  );
}

type VideoPlayerProps = {
  fileUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => void;
  currentStoryboard:
    | (StoryboardSceneProps & { start: number; end: number })
    | null;
  shouldShowOverlayImage: boolean;
  onImageError: () => void;
  overlayMode: 'corner' | 'fullscreen';
};

function VideoPlayer({
  fileUrl,
  videoRef,
  onTimeUpdate,
  onLoadedMetadata,
  currentStoryboard,
  shouldShowOverlayImage,
  onImageError,
  overlayMode,
}: VideoPlayerProps) {
  const formatTimeRange = (
    start: number | null | undefined,
    end: number | null | undefined
  ) => `${formatTimestamp(start)} → ${formatTimestamp(end)}`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black h-dvh">
      {fileUrl ? (
        <video
          ref={videoRef}
          src={fileUrl}
          controls={false}
          className="h-full w-full object-contain"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Load or select a Shade asset to preview its media.
        </div>
      )}

      {currentStoryboard && (
        <div
          className={`pointer-events-none overflow-hidden absolute rounded-lg border border-white/10 bg-black/90 shadow-sm backdrop-blur-sm ${
            overlayMode === 'fullscreen'
              ? 'inset-0 flex flex-col items-center justify-center'
              : 'left-4 top-4 max-w-96 w-full'
          }`}
        >
          {shouldShowOverlayImage && currentStoryboard.image_url && (
            <div
              className={`relative overflow-hidden border border-white/10 ${
                overlayMode === 'fullscreen'
                  ? 'w-full h-full'
                  : 'w-full aspect-video'
              }`}
            >
              <Image
                src={currentStoryboard.image_url}
                alt={currentStoryboard.title}
                fill
                sizes={
                  overlayMode === 'fullscreen'
                    ? '100vw'
                    : '(max-width: 1024px) 80vw, 25vw'
                }
                className="object-contain"
                loader={externalImageLoader}
                unoptimized
                onError={onImageError}
              />
            </div>
          )}
          <div
            className={`px-4 py-3 ${
              overlayMode === 'fullscreen'
                ? 'absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm'
                : ''
            }`}
          >
            <p className="text-sm font-medium text-white">
              {currentStoryboard.title}
            </p>
            <p className="text-[10px] text-white/70">
              {formatTimeRange(currentStoryboard.start, currentStoryboard.end)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoryboardPreviewView({
  storyboards,
  fileUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMatchedTranscript,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateNotes: _onUpdateNotes,
  onExitPreview,
}: StoryboardPreviewViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayFailedIdentity, setOverlayFailedIdentity] = useState<
    string | null
  >(null);
  const [overlayMode, setOverlayMode] = useState<'corner' | 'fullscreen'>(
    'corner'
  );

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

  const overlayImageIdentity =
    currentStoryboard?.image_url && currentStoryboard?.id
      ? `${currentStoryboard.id}:${currentStoryboard.image_url}`
      : null;

  const shouldShowOverlayImage =
    Boolean(overlayImageIdentity) &&
    overlayFailedIdentity !== overlayImageIdentity;

  const handleOverlayImageError = () => {
    if (overlayImageIdentity) {
      setOverlayFailedIdentity(overlayImageIdentity);
    }
  };

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(event.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    setMediaDuration(event.currentTarget.duration);
  };

  const handleTogglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

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
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          video.pause();
          setIsPlaying(false);
        });
    }
  }, []);

  const handleToggleOverlayMode = useCallback(() => {
    setOverlayMode((prev) => (prev === 'corner' ? 'fullscreen' : 'corner'));
  }, []);

  return (
    <div className="h-dvh">
      {/* Exit button for fullscreen mode */}
      {onExitPreview && (
        <div className="flex justify-end fixed top-4 right-4 z-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onExitPreview}
            className="gap-2"
          >
            <X className="size-4" />
            Exit Preview
          </Button>
        </div>
      )}

      <VideoPlayer
        fileUrl={fileUrl}
        videoRef={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        currentStoryboard={currentStoryboard}
        shouldShowOverlayImage={shouldShowOverlayImage}
        onImageError={handleOverlayImageError}
        overlayMode={overlayMode}
      />

      <TimelineScrubber
        timedStoryboards={timedStoryboards}
        timingMeta={timingMeta}
        currentStoryboard={currentStoryboard}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTogglePlayPause={handleTogglePlayPause}
        mediaDuration={mediaDuration}
        onSeekToStoryboard={seekToStoryboard}
        overlayMode={overlayMode}
        onToggleOverlayMode={handleToggleOverlayMode}
      />
      {/* {fileUrl && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Click any storyboard marker to jump to that moment in the video.
          </p>
          {mediaDuration && (
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(currentTime)} / {formatTimestamp(mediaDuration)}
            </p>
          )}
        </div>
      )} */}

      {/* {untimedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {untimedCount} storyboard{untimedCount === 1 ? '' : 's'} missing
          timecodes can't appear in the preview overlay.
        </div>
      )} */}

      {/* <StoryboardDetailPanel
        currentStoryboard={currentStoryboard}
        shouldShowDetailImage={shouldShowDetailImage}
        onImageError={handleDetailImageError}
        onUpdateNotes={onUpdateNotes}
        matchedTranscript={matchedTranscript}
        onSeekToStoryboard={seekToStoryboard}
      /> */}
    </div>
  );
}
