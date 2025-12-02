'use client';

import { updateRoom } from '@/app/actions/rooms';
import type { ImageModel } from '@/app/api/generate-image/route';
import type { RoomStatus } from '@/app/page';
import { ExportToFigmaDialogContent } from '@/components/custom/export-to-figma-dialog';
import type { StoryboardViewProps } from '@/components/custom/storyboard-list-view';
import {
  StoryboardGridView,
  StoryboardListView,
} from '@/components/custom/storyboard-list-view';
import { StoryboardPreviewView } from '@/components/custom/storyboard-preview-view';
import { TopNavbar } from '@/components/custom/top-navbar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useCollaborativeStoryboards,
  type TranscriptWordSegment,
} from '@/hooks/use-collaborative-storyboards';
import { useImageGenerationQueue } from '@/hooks/use-image-generation-queue';
import { usePresence } from '@/hooks/use-presence';
import { useShadeAsset } from '@/hooks/use-shade-asset';
import type { StoredTranscriptEntry } from '@/liveblocks.config';
import { useCallback, useEffect, useState } from 'react';

type StoryboardEditorProps = {
  roomId: string;
  initialRoomName: string;
  initialRoomStatus: RoomStatus;
};

export function StoryboardEditor({
  roomId,
  initialRoomName,
  initialRoomStatus,
}: StoryboardEditorProps) {
  const {
    asset,
    fileUrl,
    loading,
    error,
    fetchAsset,
    reloadAssetMetadata,
    pathInput,
    setPathInput,
  } = useShadeAsset();

  const {
    storyboards,
    transcript,
    assetPath,
    transcriptContent,
    getMatchedTranscript,
    handleSplitStoryboards,
    resetStoryboards,
    setTranscript,
    setAssetPath,
    splitStoryboard,
    mergeStoryboard,
    updateStoryboardImageUrl,
    updateStoryboardNotes,
    updateStoryboardPrompt,
  } = useCollaborativeStoryboards();

  // Initialize image generation queue with balance refresh callback
  const { addToQueue, getJobStatus, getQueueStats, retryJob } =
    useImageGenerationQueue(updateStoryboardImageUrl);

  const { others } = usePresence();

  const [cuttingStoryboardId, setCuttingStoryboardId] = useState<string | null>(
    null
  );
  const [cutPosition, setCutPosition] = useState<{
    storyboardId: string;
    text: string;
    splitTime: number | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'preview'>('grid');
  const [previousViewMode, setPreviousViewMode] = useState<'list' | 'grid'>(
    'grid'
  );
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(initialRoomStatus);
  const [roomName, setRoomName] = useState<string>(initialRoomName);
  const [isBatchGenerateDialogOpen, setIsBatchGenerateDialogOpen] =
    useState(false);
  const [batchGenerateModel, setBatchGenerateModel] = useState<ImageModel>(
    'fal-ai/flux/schnell'
  );

  const handleStatusChange = useCallback(
    async (newStatus: RoomStatus) => {
      const previousStatus = roomStatus;
      setRoomStatus(newStatus); // Optimistic update

      try {
        await updateRoom(roomId, { status: newStatus });
      } catch (error) {
        console.error('Failed to update room status:', error);
        setRoomStatus(previousStatus); // Revert on error
      }
    },
    [roomId, roomStatus]
  );

  const handleNameChange = useCallback(
    async (newName: string) => {
      const previousName = roomName;
      setRoomName(newName); // Optimistic update

      try {
        await updateRoom(roomId, { name: newName });
      } catch (error) {
        console.error('Failed to update room name:', error);
        setRoomName(previousName); // Revert on error
      }
    },
    [roomId, roomName]
  );

  // Check if we need to show setup dialog (no asset path set)
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  useEffect(() => {
    if (initialSetupDone) return;

    if (!assetPath && !asset) {
      setIsSetupDialogOpen(true);
      setInitialSetupDone(true);
    } else if (assetPath && !asset) {
      // Asset path exists in storage, fetch the asset
      reloadAssetMetadata(assetPath).catch(console.error);
      setPathInput(assetPath);
      setInitialSetupDone(true);
    }
  }, [assetPath, asset, reloadAssetMetadata, setPathInput, initialSetupDone]);

  // Auto-split storyboards when transcript is loaded and no storyboards exist
  useEffect(() => {
    if (
      transcript &&
      transcript.length > 0 &&
      storyboards.length === 0 &&
      !isSplitting
    ) {
      // Use a separate effect callback to avoid calling setState directly
      const performSplit = async () => {
        setIsSplitting(true);
        try {
          await handleSplitStoryboards();
        } finally {
          setIsSplitting(false);
        }
      };
      performSplit();
    }
  }, [transcript, storyboards.length, isSplitting, handleSplitStoryboards]);

  const handleSubmit = async () => {
    resetStoryboards();
    const result = await fetchAsset(pathInput);
    if (result) {
      setAssetPath(pathInput);
      if (result.transcript) {
        // Convert ShadeTranscriptEntry[] to StoredTranscriptEntry[]
        const storedTranscript: StoredTranscriptEntry[] = result.transcript.map(
          (entry) => ({
            id: entry.id,
            speaker: entry.speaker,
            start: entry.start,
            end: entry.end,
            text: entry.text,
            words: entry.words?.map((word) => ({
              text: word.text,
              start: word.start,
              end: word.end,
              confidence: word.confidence,
            })),
          })
        );
        setTranscript(storedTranscript);
      }
      setIsSetupDialogOpen(false);
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

  // Image generation handlers
  const handleGenerateImage = useCallback(
    (storyboardId: string, prompt: string, model: ImageModel) => {
      addToQueue(storyboardId, prompt, model);
    },
    [addToQueue]
  );

  const handleRetryGeneration = useCallback(
    (storyboardId: string) => {
      retryJob(storyboardId);
    },
    [retryJob]
  );

  const handleBatchGenerate = useCallback(() => {
    const storyboardsWithoutImages = storyboards.filter((sb) => !sb.image_url);

    storyboardsWithoutImages.forEach((storyboard) => {
      let prompt = '';

      // Check if there's a stored prompt for this scene
      if (storyboard.prompt?.trim()) {
        prompt = storyboard.prompt.trim();
      } else {
        // Generate default prompt from transcript and notes
        const matchedTranscript = getMatchedTranscript(storyboard);
        const transcriptText = matchedTranscript
          .map((segment) => {
            const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
            return `${speakerPrefix}${segment.text}`;
          })
          .join('\n');

        const notesText = storyboard.notes?.trim() || '';

        if (transcriptText) {
          prompt += transcriptText;
        }
        if (notesText) {
          if (prompt) {
            prompt += '\n\n';
          }
          prompt += `Notes: ${notesText}`;
        }
        if (!prompt) {
          prompt = storyboard.title || 'Generate an image for this scene';
        }
      }

      addToQueue(storyboard.id, prompt, batchGenerateModel);
    });

    setIsBatchGenerateDialogOpen(false);
  }, [storyboards, getMatchedTranscript, addToQueue, batchGenerateModel]);

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
    onUpdateNotes: updateStoryboardNotes,
    onUpdatePrompt: updateStoryboardPrompt,
    getGenerationJob: getJobStatus,
    onGenerateImage: handleGenerateImage,
    onRetryGeneration: handleRetryGeneration,
  };

  const showCreateStoryboardsCta = storyboards.length === 0 && Boolean(asset);

  const isPreviewMode = viewMode === 'preview';

  const storyboardsWithoutImages = storyboards.filter(
    (sb) => !sb.image_url
  ).length;
  const queueStats = getQueueStats();

  const handleViewModeChange = (newMode: 'list' | 'grid' | 'preview') => {
    // Store previous view mode when entering preview
    if (newMode === 'preview' && (viewMode === 'list' || viewMode === 'grid')) {
      setPreviousViewMode(viewMode);
    }
    setViewMode(newMode);
  };

  const handleExitPreview = () => {
    setViewMode(previousViewMode);
  };

  // Fullscreen preview mode
  if (isPreviewMode) {
    return (
      <StoryboardPreviewView
        storyboards={storyboards}
        fileUrl={fileUrl}
        getMatchedTranscript={getMatchedTranscript}
        onUpdateNotes={updateStoryboardNotes}
        onExitPreview={handleExitPreview}
      />
    );
  }

  return (
    <div className="w-full flex flex-col min-h-dvh">
      <TopNavbar
        asset={asset}
        storyboards={storyboards}
        others={others}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenExportDialog={() => setIsExportDialogOpen(true)}
        roomStatus={roomStatus}
        onStatusChange={handleStatusChange}
        roomName={roomName}
        onNameChange={handleNameChange}
        queueStats={queueStats}
        onOpenBatchGenerate={() => setIsBatchGenerateDialogOpen(true)}
        storyboardsWithoutImages={storyboardsWithoutImages}
      />

      <main className="flex-1 space-y-10 p-8">
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
                    onClick={() => {
                      setIsSplitting(true);
                      handleSplitStoryboards();
                      setIsSplitting(false);
                    }}
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
            ) : null}
          </div>
        </div>
      </main>

      {/* Setup Dialog - shown when no asset is loaded */}
      <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up a Shade asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
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
                {loading ? 'Fetching...' : 'Load Asset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTranscriptDialogOpen}
        onOpenChange={setIsTranscriptDialogOpen}
      >
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Transcript</DialogTitle>
            <DialogClose onClick={() => setIsTranscriptDialogOpen(false)} />
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-md">
              {transcriptContent}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {storyboards.length > 0 && (
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <ExportToFigmaDialogContent
            storyboards={storyboards}
            transcriptContent={transcriptContent}
            getMatchedTranscript={getMatchedTranscript}
            onClose={() => setIsExportDialogOpen(false)}
            roomId={roomId}
          />
        </Dialog>
      )}

      {/* Batch Generate Dialog */}
      <Dialog
        open={isBatchGenerateDialogOpen}
        onOpenChange={setIsBatchGenerateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Images for All Scenes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Generate AI images for {storyboardsWithoutImages} scene
              {storyboardsWithoutImages === 1 ? '' : 's'} without images.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <select
                value={batchGenerateModel}
                onChange={(e) =>
                  setBatchGenerateModel(e.target.value as ImageModel)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="fal-ai/flux/schnell">FLUX Schnell (Fast)</option>
                <option value="fal-ai/flux/dev">FLUX Dev (Quality)</option>
                <option value="fal-ai/fast-sdxl">Fast SDXL (Balanced)</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Images will be generated using the transcript and notes for each
              scene. Up to 3 images will be generated concurrently.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsBatchGenerateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBatchGenerate}
                disabled={storyboardsWithoutImages === 0}
              >
                Generate {storyboardsWithoutImages} Image
                {storyboardsWithoutImages === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
