'use client';

import { ExportToFigmaDialogContent } from '@/components/custom/export-to-figma-dialog';
import { Sidebar } from '@/components/custom/sidebar';
import type { StoryboardViewProps } from '@/components/custom/storyboard-list-view';
import {
  StoryboardGridView,
  StoryboardListView,
} from '@/components/custom/storyboard-list-view';
import { StoryboardPreviewView } from '@/components/custom/storyboard-preview-view';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSaveState } from '@/hooks/use-save-state';
import { useShadeAsset } from '@/hooks/use-shade-asset';
import {
  useStoryboards,
  type TranscriptWordSegment,
} from '@/hooks/use-storyboards';
import { FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ClientPage() {
  const {
    asset,
    fileUrl,
    transcript,
    loading,
    error,
    fetchAsset,
    reloadAssetMetadata,
    pathInput,
    setPathInput,
    setTranscript,
  } = useShadeAsset();
  const [cuttingStoryboardId, setCuttingStoryboardId] = useState<string | null>(
    null
  );
  const [cutPosition, setCutPosition] = useState<{
    storyboardId: string;
    text: string;
    splitTime: number | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'preview'>('list');
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const {
    storyboards,
    storyboardError,
    isSplitting,
    transcriptContent,
    getMatchedTranscript,
    handleSplitStoryboards,
    resetStoryboards,
    setStoryboards,
    splitStoryboard,
    mergeStoryboard,
    updateStoryboardImageUrl,
  } = useStoryboards(transcript);

  const { isSaving, saveMessage, handleSave, handleSaveAs, handleLoad } =
    useSaveState({
      assetPath: pathInput,
      transcript,
      storyboards,
    });

  const handleSubmit = () => {
    resetStoryboards();
    fetchAsset(pathInput);
  };

  // Automatically split storyboards when a new transcript is loaded and no storyboards exist
  useEffect(() => {
    if (transcript && storyboards.length === 0 && !isSplitting) {
      handleSplitStoryboards();
    }
  }, [transcript, storyboards.length, isSplitting, handleSplitStoryboards]);

  const handleLoadFile = async () => {
    const data = await handleLoad();
    if (data) {
      setPathInput(data.assetPath);

      if (data.transcript) {
        setTranscript(data.transcript);
      }

      if (Array.isArray(data.storyboards)) {
        setStoryboards(data.storyboards);
      }

      if (data.assetPath) {
        // Run in background so we don't block UI updates if it takes time
        reloadAssetMetadata(data.assetPath).catch(console.error);
      }
    }
  };

  const handleCutClick = (storyboardId: string) => {
    if (cuttingStoryboardId === storyboardId) {
      setCuttingStoryboardId(null);
      setCutPosition(null);
    } else {
      setCuttingStoryboardId(storyboardId);
      setCutPosition(null);
    }
  };

  const handleWordClick = (
    storyboardId: string,
    word: TranscriptWordSegment
  ) => {
    if (word.end === null) {
      return;
    }

    setCutPosition({
      storyboardId,
      text: `Split after "${word.text}"`,
      splitTime: word.end,
    });
  };

  const handleConfirmCut = () => {
    if (!cutPosition || cutPosition.splitTime === null) {
      return;
    }

    splitStoryboard(cutPosition.storyboardId, cutPosition.splitTime);
    setCuttingStoryboardId(null);
    setCutPosition(null);
  };

  const handleCancelCut = () => {
    setCuttingStoryboardId(null);
    setCutPosition(null);
  };

  const storyboardViewProps: StoryboardViewProps = {
    storyboards,
    cuttingStoryboardId,
    cutPosition,
    getMatchedTranscript,
    onCutClick: handleCutClick,
    onWordClick: handleWordClick,
    onConfirmCut: handleConfirmCut,
    onCancelCut: handleCancelCut,
    onMergeUp: (id: string) => mergeStoryboard(id, 'up'),
    onMergeDown: (id: string) => mergeStoryboard(id, 'down'),
    onUpdateImageUrl: updateStoryboardImageUrl,
  };

  const showCreateStoryboardsCta = storyboards.length === 0 && Boolean(asset);

  return (
    <div className="w-full flex flex-row">
      <div className="w-80 shrink-0 h-dvh relative">
        <Sidebar
          error={error}
          asset={asset}
          fileUrl={fileUrl}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          isSaving={isSaving}
          saveMessage={saveMessage}
          isSplitting={isSplitting}
          transcriptContent={transcriptContent}
          storyboards={storyboards}
          onOpenTranscriptDialog={() => setIsTranscriptDialogOpen(true)}
          onOpenExportDialog={() => setIsExportDialogOpen(true)}
        />
      </div>

      <main className="flex-1 space-y-10 p-8">
        <div className="space-y-4">
          {storyboardError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {storyboardError}
            </div>
          )}

          <div className="space-y-4">
            {storyboards.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Viewing {storyboards.length} storyboard
                  {storyboards.length === 1 ? '' : 's'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex gap-2">
                    {[
                      { id: 'list' as const, label: 'List view' },
                      { id: 'grid' as const, label: 'Grid view' },
                      { id: 'preview' as const, label: 'Preview' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`text-sm rounded-md border px-3 py-1.5 transition ${
                          viewMode === option.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setViewMode(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {storyboards.length === 0 ? (
              showCreateStoryboardsCta ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center space-y-3">
                  <p className="text-sm font-medium">
                    Storyboards are not created for this file yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Generate them automatically from the transcript to start
                    editing.
                  </p>
                  <Button
                    onClick={handleSplitStoryboards}
                    disabled={isSplitting}
                  >
                    {isSplitting
                      ? 'Creating storyboards…'
                      : 'Create storyboards'}
                  </Button>
                </div>
              ) : null
            ) : viewMode === 'list' ? (
              <StoryboardListView {...storyboardViewProps} />
            ) : viewMode === 'grid' ? (
              <StoryboardGridView {...storyboardViewProps} />
            ) : (
              <StoryboardPreviewView
                storyboards={storyboards}
                fileUrl={fileUrl}
                getMatchedTranscript={getMatchedTranscript}
              />
            )}
          </div>
        </div>
      </main>

      {/* All dialogs rendered at the bottom for proper z-index stacking */}
      <Dialog open={!asset} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up a Shade asset</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shade Asset Path</label>
              <Input
                type="text"
                placeholder="/path/to/file"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the Shade asset path to fetch metadata and transcript.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !pathInput.trim()}
              >
                {loading ? 'Fetching...' : 'Create Project'}
              </Button>
              <Button
                variant="outline"
                onClick={handleLoadFile}
                disabled={loading}
                className="justify-center"
              >
                <FolderOpen className="size-3.5" />
                Load saved project
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTranscriptDialogOpen}
        onOpenChange={setIsTranscriptDialogOpen}
      >
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transcript</DialogTitle>
            <DialogClose onClose={() => setIsTranscriptDialogOpen(false)} />
          </DialogHeader>
          <DialogBody className="flex-1 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-md">
              {transcriptContent}
            </pre>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {storyboards.length > 0 && (
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <ExportToFigmaDialogContent
            storyboards={storyboards}
            transcriptContent={transcriptContent}
            getMatchedTranscript={getMatchedTranscript}
            onClose={() => setIsExportDialogOpen(false)}
          />
        </Dialog>
      )}
    </div>
  );
}
