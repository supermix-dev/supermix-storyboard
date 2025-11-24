'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type {
  TranscriptSegment,
  TranscriptWordSegment,
} from '@/hooks/use-storyboards';

export type StoryboardCardProps = {
  storyboard: StoryboardSceneProps;
  storyboardIndex: number;
  totalStoryboards: number;
  matchedTranscript: TranscriptSegment[];
  canSplit: boolean;
  isCutting: boolean;
  hasCutPosition: boolean;
  cutPosition: {
    storyboardId: string;
    text: string;
    splitTime: number | null;
  } | null;
  onCutClick: (storyboardId: string) => void;
  onWordClick: (storyboardId: string, word: TranscriptWordSegment) => void;
  onConfirmCut: () => void;
  onCancelCut: () => void;
  onMergeUp: (storyboardId: string) => void;
  onMergeDown: (storyboardId: string) => void;
  onUpdateImageUrl?: (storyboardId: string, imageUrl: string | null) => void;
};

export function StoryboardCard({
  storyboard,
  storyboardIndex,
  totalStoryboards,
  matchedTranscript,
  canSplit,
  isCutting,
  hasCutPosition,
  cutPosition,
  onCutClick,
  onWordClick,
  onConfirmCut,
  onCancelCut,
  onMergeUp,
  onMergeDown,
}: StoryboardCardProps) {
  return (
    <Card className="rounded-lg border border-muted bg-muted/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="text-base font-semibold">{storyboard.title}</h4>
          {(storyboard.start || storyboard.end) && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {storyboard.start?.toFixed(2)}s → {storyboard.end?.toFixed(2)}s
            </span>
          )}
        </div>
      </div>

      {isCutting && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-sm font-medium">
            Click or select text in the transcript to position the cut
          </p>
          {hasCutPosition && cutPosition?.splitTime !== null && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-primary/10">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">
                  Cut will be at:{' '}
                  <span className="font-medium text-foreground">
                    {cutPosition!.splitTime!.toFixed(2)}s
                  </span>
                </p>
                {cutPosition!.text && (
                  <p className="text-xs text-muted-foreground bg-background/50 p-1 rounded">
                    &ldquo;{cutPosition!.text}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onConfirmCut}>
                  Confirm Cut
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelCut}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {matchedTranscript.length > 0 && (
        <div className="mt-3 pt-3 border-t border-muted">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Transcript:</p>
            {isCutting && (
              <p className="text-xs text-primary font-medium">
                ✂️ Select a word to split after
              </p>
            )}
          </div>
          <div className="space-y-2">
            {matchedTranscript.map((entry, idx) => {
              const isBeforeCut =
                hasCutPosition &&
                cutPosition?.splitTime !== null &&
                entry.words.length > 0 &&
                entry.words.some(
                  (w) => w.end !== null && w.end <= cutPosition!.splitTime!
                );
              const isAfterCut =
                hasCutPosition &&
                cutPosition?.splitTime !== null &&
                entry.words.length > 0 &&
                entry.words.some(
                  (w) => w.start !== null && w.start > cutPosition!.splitTime!
                );

              // In cut mode, render words individually
              if (isCutting && entry.words.length > 0) {
                return (
                  <div
                    key={entry.id ?? idx}
                    className="text-sm bg-background/50 p-2 rounded"
                  >
                    {entry.speaker && (
                      <span className="font-medium text-primary mr-2">
                        {entry.speaker}:
                      </span>
                    )}
                    {entry.words.map((word, wordIdx) => {
                      const isCutWord =
                        hasCutPosition && cutPosition?.splitTime === word.end;

                      return (
                        <span
                          key={`${entry.id}-${wordIdx}`}
                          className={`inline-block px-0.5 rounded cursor-pointer transition-colors relative group ${
                            isCutWord
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-primary/20'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onWordClick(storyboard.id, word);
                          }}
                          title={`Split after: ${word.text}`}
                        >
                          {word.text}
                          {/* Visual split indicator on hover */}
                          <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 pointer-events-none" />
                        </span>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div
                  key={entry.id ?? idx}
                  className={`text-sm bg-background/50 p-2 rounded relative ${
                    hasCutPosition && isBeforeCut
                      ? 'border-l-2 border-primary/50'
                      : ''
                  } ${
                    hasCutPosition && isAfterCut
                      ? 'border-l-2 border-destructive/50'
                      : ''
                  }`}
                >
                  {hasCutPosition &&
                    cutPosition?.splitTime !== null &&
                    isBeforeCut &&
                    !isAfterCut && (
                      <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-primary animate-pulse" />
                    )}
                  {entry.speaker && (
                    <span className="font-medium text-primary mr-2">
                      {entry.speaker}:
                    </span>
                  )}
                  {entry.text}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-muted pt-3">
        {storyboardIndex > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMergeUp(storyboard.id)}
          >
            Merge Up
          </Button>
        )}
        {storyboardIndex < totalStoryboards - 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMergeDown(storyboard.id)}
          >
            Merge Down
          </Button>
        )}
        {canSplit && (
          <Button
            size="sm"
            variant={isCutting ? 'default' : 'outline'}
            onClick={() => onCutClick(storyboard.id)}
          >
            {isCutting ? 'Cancel Cut' : 'Cut'}
          </Button>
        )}
      </div>
    </Card>
  );
}
