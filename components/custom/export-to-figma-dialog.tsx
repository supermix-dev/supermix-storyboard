'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TranscriptSegment } from '@/hooks/use-storyboards';
import { Check, Clipboard, Download } from 'lucide-react';
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
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );

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

  const filename = useMemo(() => {
    const timestamp = new Date(exportPayload.meta.generatedAt)
      .toISOString()
      .replace(/[:.]/g, '-');
    return `supermix-storyboards-${timestamp}.json`;
  }, [exportPayload.meta.generatedAt]);

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

  const handleDownload = () => {
    try {
      const blob = new Blob([exportJson], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download storyboard export', error);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Export storyboards for Figma</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogBody className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This JSON file contains the current storyboard set plus the raw
            transcript (optional). Download it and load it inside the Supermix
            Storyboards Figma plugin to generate frames on a Figma page.
          </p>
          <p className="text-xs text-muted-foreground">
            Export created{' '}
            {new Date(exportPayload.meta.generatedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCopy} type="button" className="gap-2">
            {copyState === 'copied' ? (
              <Check className="h-4 w-4" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
            {copyState === 'copied'
              ? 'Copied!'
              : copyState === 'error'
              ? 'Copy failed'
              : 'Copy JSON'}
          </Button>
          <Button
            onClick={handleDownload}
            type="button"
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 p-4 max-h-[50vh] overflow-auto text-xs font-mono leading-relaxed">
          <pre className="whitespace-pre-wrap">{exportJson}</pre>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            Tip: Keep this dialog open while running the Figma plugin so you can
            re-export after adjusting your storyboards.
          </p>
          <p>
            Storyboard image URLs are bundled in the export so the Figma plugin
            can place them. Missing images will render as a dark placeholder in
            Figma.
          </p>
          <p>
            Plugin location:{' '}
            <span className="font-medium">
              figma-plugin/Supermix Storyboards Importer
            </span>
          </p>
        </div>
      </DialogBody>
    </DialogContent>
  );
}
