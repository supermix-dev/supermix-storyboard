'use client';

import type { ReactElement } from 'react';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import {
  StoryboardCard,
  type StoryboardCardProps,
} from '@/components/custom/storyboard-card';
import { StoryboardGridCard } from '@/components/custom/storyboard-grid-card';
import type {
  TranscriptSegment,
  TranscriptWordSegment,
} from '@/hooks/use-storyboards';
import { MaxWidthContainer } from './max-width-container';

export type StoryboardViewProps = {
  storyboards: StoryboardSceneProps[];
  cuttingStoryboardId: string | null;
  cutPosition: {
    storyboardId: string;
    text: string;
    splitTime: number | null;
  } | null;
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
  onCutClick: (storyboardId: string) => void;
  onWordClick: (storyboardId: string, word: TranscriptWordSegment) => void;
  onConfirmCut: () => void;
  onCancelCut: () => void;
  onMergeUp: (storyboardId: string) => void;
  onMergeDown: (storyboardId: string) => void;
  onUpdateImageUrl: (storyboardId: string, imageUrl: string | null) => void;
};

type StoryboardCardComponent = (props: StoryboardCardProps) => ReactElement;

function renderStoryboardCards(
  CardComponent: StoryboardCardComponent,
  props: StoryboardViewProps
) {
  const {
    storyboards,
    cuttingStoryboardId,
    cutPosition,
    getMatchedTranscript,
    onCutClick,
    onWordClick,
    onConfirmCut,
    onCancelCut,
    onMergeUp,
    onMergeDown,
    onUpdateImageUrl,
  } = props;

  return storyboards.map((storyboard, storyboardIndex) => {
    const matchedTranscript = getMatchedTranscript(storyboard);
    const canSplit =
      typeof storyboard.start === 'number' &&
      typeof storyboard.end === 'number' &&
      storyboard.end > storyboard.start;
    const isCutting = cuttingStoryboardId === storyboard.id;
    const hasCutPosition = cutPosition?.storyboardId === storyboard.id;

    return (
      <CardComponent
        key={storyboard.id}
        storyboard={storyboard}
        storyboardIndex={storyboardIndex}
        totalStoryboards={storyboards.length}
        matchedTranscript={matchedTranscript}
        canSplit={canSplit}
        isCutting={isCutting}
        hasCutPosition={hasCutPosition}
        cutPosition={cutPosition}
        onCutClick={onCutClick}
        onWordClick={onWordClick}
        onConfirmCut={onConfirmCut}
        onCancelCut={onCancelCut}
        onMergeUp={onMergeUp}
        onMergeDown={onMergeDown}
        onUpdateImageUrl={onUpdateImageUrl}
      />
    );
  });
}

export function StoryboardListView(props: StoryboardViewProps) {
  if (props.storyboards.length === 0) {
    return null;
  }

  return (
    <MaxWidthContainer size="sm" className="space-y-4">
      {renderStoryboardCards(StoryboardCard, props)}
    </MaxWidthContainer>
  );
}

export function StoryboardGridView(props: StoryboardViewProps) {
  if (props.storyboards.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {renderStoryboardCards(StoryboardGridCard, props)}
    </div>
  );
}
