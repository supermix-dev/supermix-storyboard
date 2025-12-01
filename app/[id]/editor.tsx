'use client';

import { updateRoom } from '@/app/actions/rooms';
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
    setStoryboards,
    setTranscript,
    setAssetPath,
    splitStoryboard,
    mergeStoryboard,
    updateStoryboardImageUrl,
    updateStoryboardNotes,
  } = useCollaborativeStoryboards();

  const { connectionCount, others } = usePresence();

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
  useEffect(() => {
    if (!assetPath && !asset) {
      setIsSetupDialogOpen(true);
    } else if (assetPath && !asset) {
      // Asset path exists in storage, fetch the asset
      reloadAssetMetadata(assetPath).catch(console.error);
      setPathInput(assetPath);
    }
  }, [assetPath, asset, reloadAssetMetadata, setPathInput]);

  // Auto-split storyboards when transcript is loaded and no storyboards exist
  useEffect(() => {
    if (
      transcript &&
      transcript.length > 0 &&
      storyboards.length === 0 &&
      !isSplitting
    ) {
      setIsSplitting(true);
      handleSplitStoryboards();
      setIsSplitting(false);
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
  };

  const showCreateStoryboardsCta = storyboards.length === 0 && Boolean(asset);

  const isPreviewMode = viewMode === 'preview';

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
        connectionCount={connectionCount}
        others={others}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenExportDialog={() => setIsExportDialogOpen(true)}
        roomStatus={roomStatus}
        onStatusChange={handleStatusChange}
        roomName={roomName}
        onNameChange={handleNameChange}
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
    </div>
  );
}
