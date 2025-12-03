'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TranscriptSegment } from '@/hooks/use-storyboards';
import { Check, Clipboard, Download, Puzzle } from 'lucide-react';
import { useMemo, useState } from 'react';

type ExportableTranscriptSegment = Pick<
  TranscriptSegment,
  'id' | 'speaker' | 'text' | 'start' | 'end'
>;

type ExportableStoryboard = StoryboardSceneProps & {
  imageUrl?: string | null;
  transcriptText?: string;
  transcriptSegments?: ExportableTranscriptSegment[];
};

type ExportPayload = {
  meta: {
    generatedAt: string;
    totalStoryboards: number;
    transcriptIncluded: boolean;
  };
  storyboards: ExportableStoryboard[];
  transcript?: string;
};

const normalizeImageUrl = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function ExportToFigmaDialogContent({
  storyboards,
  transcriptContent,
  getMatchedTranscript,
  onClose,
}: {
  storyboards: StoryboardSceneProps[];
  transcriptContent: string;
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
  onClose: () => void;
  roomId?: string;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );
  const [isDownloadingPlugin, setIsDownloadingPlugin] = useState(false);

  const handleDownloadPlugin = async () => {
    try {
      setIsDownloadingPlugin(true);
      const response = await fetch('/api/figma-plugin/download');
      if (!response.ok) {
        throw new Error('Failed to fetch plugin bundle');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'supermix-figma-plugin.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download plugin bundle', error);
    } finally {
      setIsDownloadingPlugin(false);
    }
  };

  const storyboardsWithTranscript = useMemo<ExportableStoryboard[]>(() => {
    return storyboards.map((storyboard) => {
      const matchedSegments = getMatchedTranscript
        ? getMatchedTranscript(storyboard)
        : [];
      const normalizedImageUrl = normalizeImageUrl(storyboard.image_url);

      const transcriptText = matchedSegments
        .map((segment) => {
          const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
          return `${speakerPrefix}${segment.text}`.trim();
        })
        .filter((line) => line.length > 0)
        .join('\n');

      const exportableSegments: ExportableTranscriptSegment[] =
        matchedSegments.map((segment) => ({
          id: segment.id,
          speaker: segment.speaker,
          text: segment.text,
          start: segment.start,
          end: segment.end,
        }));

      return {
        ...storyboard,
        image_url: normalizedImageUrl,
        imageUrl: normalizedImageUrl,
        transcriptText: transcriptText.length > 0 ? transcriptText : undefined,
        transcriptSegments: exportableSegments.length
          ? exportableSegments
          : undefined,
      };
    });
  }, [storyboards, getMatchedTranscript]);

  const exportPayload = useMemo<ExportPayload>(() => {
    const generatedAt = new Date().toISOString();
    const payload: ExportPayload = {
      meta: {
        generatedAt,
        totalStoryboards: storyboards.length,
        transcriptIncluded: Boolean(transcriptContent?.trim().length),
      },
      storyboards: storyboardsWithTranscript,
    };

    if (transcriptContent?.trim()) {
      payload.transcript = transcriptContent.trim();
    }

    return payload;
  }, [storyboards.length, storyboardsWithTranscript, transcriptContent]);

  const exportJson = useMemo(
    () => JSON.stringify(exportPayload, null, 2),
    [exportPayload]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy storyboard export', error);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Export storyboards for Figma</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>
      <div className="space-y-6">
        {/* Primary action: Copy to clipboard */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clipboard className="h-4 w-4" />
            Copy Storyboards
          </div>
          <p className="text-sm text-muted-foreground">
            Copy your storyboards to the clipboard, then paste them in the Figma
            plugin.
          </p>
          <Button onClick={handleCopy} className="gap-2">
            {copyState === 'copied' ? (
              <>
                <Check className="h-4 w-4" />
                Copied to clipboard!
              </>
            ) : copyState === 'error' ? (
              <>
                <Clipboard className="h-4 w-4" />
                Failed to copy — try again
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            {storyboards.length} storyboard{storyboards.length !== 1 ? 's' : ''}{' '}
            ready to export
          </p>
        </div>

        {/* Plugin download section */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Puzzle className="h-4 w-4" />
            Figma Plugin
          </div>
          <p className="text-xs text-muted-foreground">
            Don&apos;t have the plugin yet? Download the Supermix Storyboards
            Importer and install it via Plugins → Development → Import plugin
            from manifest.
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownloadPlugin}
            disabled={isDownloadingPlugin}
          >
            <Download className="h-4 w-4" />
            {isDownloadingPlugin ? 'Preparing bundle…' : 'Download Plugin'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
