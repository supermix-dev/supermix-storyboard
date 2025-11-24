'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import { FigmaPluginSection } from '@/components/custom/figma-plugin-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShadeAssetProps } from '@/lib/shade/shade.types';
import { AlertCircle, ExternalLink, Figma, FileText, Save } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

type SidebarProps = {
  error: string | null;
  asset: ShadeAssetProps | null;
  fileUrl: string | null;
  onSave: () => void;
  onSaveAs: () => void;
  isSaving: boolean;
  saveMessage: {
    type: 'success' | 'error';
    text: string;
  } | null;
  isSplitting: boolean;
  transcriptContent: string;
  storyboards: StoryboardSceneProps[];
  onOpenTranscriptDialog?: () => void;
  onOpenExportDialog?: () => void;
};

export function Sidebar({
  error,
  asset,
  fileUrl,
  onSave,
  onSaveAs,
  isSaving,
  saveMessage,
  isSplitting,
  transcriptContent,
  storyboards,
  onOpenTranscriptDialog,
  onOpenExportDialog,
}: SidebarProps) {
  const [isDownloadingPlugin, setIsDownloadingPlugin] = useState(false);

  const handleDownloadPluginBundle = useCallback(async () => {
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
    } catch (downloadError) {
      console.error('Failed to download plugin bundle', downloadError);
    } finally {
      setIsDownloadingPlugin(false);
    }
  }, []);

  return (
    <>
      <div className="w-80 fixed p-4 top-0 left-0 h-dvh shrink-0 border-r flex flex-col bg-background">
        <div className="mb-6">
          <h1 className="text-base font-bold tracking-tight flex items-center gap-3">
            Supermix<Badge variant="outline">Storyboard</Badge>
          </h1>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto">
          {saveMessage && (
            <div
              className={`text-xs px-2 py-1 rounded ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {saveMessage.text}
            </div>
          )}
          {/* Asset Details */}
          <div className="space-y-3">
            {asset ? (
              <div className="space-y-2">
                <div className="p-3 rounded-md bg-muted/50 space-y-1">
                  <div
                    className="font-medium text-sm break-all line-clamp-2"
                    title={asset.name}
                  >
                    {asset.name}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {fileUrl && (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Original File
                      </Link>
                    </Button>
                  )}
                  {transcriptContent && (
                    <Button
                      onClick={onOpenTranscriptDialog}
                      variant="outline"
                      size="sm"
                    >
                      <FileText className="w-3 h-3" />
                      View Transcript
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving}
                  >
                    <Save className="w-6 h-6" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSaveAs}
                    disabled={isSaving}
                  >
                    <Save className="w-6 h-6" />
                    Save As
                  </Button>
                  {storyboards.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center gap-2"
                      onClick={onOpenExportDialog}
                    >
                      <Figma className="h-4 w-4" />
                      Export to Figma
                    </Button>
                  )}
                </div>
                {isSplitting && (
                  <div className="text-xs text-muted-foreground animate-pulse flex items-center gap-2 mt-2">
                    <span>Processing storyboards...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No asset loaded. Create new project or open file.
              </div>
            )}
          </div>

          <FigmaPluginSection
            onDownload={handleDownloadPluginBundle}
            isDownloading={isDownloadingPlugin}
          />
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-xs flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </>
  );
}
