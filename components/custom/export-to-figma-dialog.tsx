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
import { Check, Clipboard, Download, ExternalLink, Puzzle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  roomId,
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
  const [linkState, setLinkState] = useState<
    'idle' | 'generating' | 'generated' | 'error'
  >('idle');
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [linkCopyState, setLinkCopyState] = useState<'idle' | 'copied'>('idle');
  const [pageUrlCopyState, setPageUrlCopyState] = useState<'idle' | 'copied'>(
    'idle'
  );
  const [isDownloadingPlugin, setIsDownloadingPlugin] = useState(false);

  // Get the current page URL for quick copy
  const [pageUrl, setPageUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use origin + roomId for a clean URL
      const url = roomId
        ? `${window.location.origin}/${roomId}`
        : window.location.href;
      setPageUrl(url);
    }
  }, [roomId]);

  const handleCopyPageUrl = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setPageUrlCopyState('copied');
      setTimeout(() => setPageUrlCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy page URL', error);
    }
  };

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

  const handleGenerateLink = async () => {
    setLinkState('generating');
    setShareableUrl(null);

    try {
      const response = await fetch('/api/figma-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate shareable link');
      }

      const data = await response.json();
      setShareableUrl(data.url);
      setLinkState('generated');

      // Auto-copy to clipboard
      await navigator.clipboard.writeText(data.url);
      setLinkCopyState('copied');
      setTimeout(() => setLinkCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to generate shareable link', error);
      setLinkState('error');
      setTimeout(() => setLinkState('idle'), 3000);
    }
  };

  const handleCopyLink = async () => {
    if (!shareableUrl) return;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setLinkCopyState('copied');
      setTimeout(() => setLinkCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy link', error);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Export storyboards for Figma</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Copy this page URL and paste it in the Figma plugin to import your
            storyboards.
          </p>
        </div>

        {/* Primary action: Copy page URL */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ExternalLink className="h-4 w-4" />
            Storyboard URL
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={pageUrl}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
            <Button onClick={handleCopyPageUrl} className="gap-1.5 shrink-0">
              {pageUrlCopyState === 'copied' ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this URL in the Figma plugin to import. The plugin will fetch
            your storyboards directly.
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

        {/* Manual export options */}
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
            <Download className="h-3 w-3" />
            Export manually (JSON)
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCopy}
                type="button"
                variant="outline"
                className="gap-2"
              >
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
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                Show JSON preview
              </summary>
              <div className="mt-3 rounded-md border bg-muted/40 p-4 max-h-[30vh] overflow-auto text-xs font-mono leading-relaxed">
                <pre className="whitespace-pre-wrap">{exportJson}</pre>
              </div>
            </details>
          </div>
        </details>

        <div className="text-xs text-muted-foreground">
          <p>
            {storyboards.length} storyboard{storyboards.length !== 1 ? 's' : ''}{' '}
            ready to export
          </p>
        </div>
      </div>
    </DialogContent>
  );
}
