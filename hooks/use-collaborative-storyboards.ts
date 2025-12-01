'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import {
  useMutation,
  useStorage,
  type StoredStoryboard,
  type StoredTranscriptEntry,
} from '@/liveblocks.config';
import { useMemo } from 'react';

export type TranscriptWordSegment = {
  id: string;
  text: string;
  start: number | null;
  end: number | null;
};

export type TranscriptSegment = {
  id: string;
  speaker: string | null;
  text: string;
  start: number | null;
  end: number | null;
  words: TranscriptWordSegment[];
};

export type TranscriptCoverageGap = {
  id: string;
  speaker: string | null;
  text: string;
  missingCount: number;
  totalCount: number;
  start: number | null;
  end: number | null;
};

type StoryboardRange = {
  id: string;
  start: number;
  end: number;
};

export function useCollaborativeStoryboards() {
  // Read from Liveblocks storage
  const storyboards = useStorage((root) => root.storyboards) ?? [];
  const transcript = useStorage((root) => root.transcript) ?? [];
  const assetPath = useStorage((root) => root.assetPath) ?? '';

  // Mutations to update storage
  const setStoryboards = useMutation(
    ({ storage }, newStoryboards: StoryboardSceneProps[]) => {
      storage.set('storyboards', newStoryboards as StoredStoryboard[]);
    },
    []
  );

  const setTranscript = useMutation(
    ({ storage }, newTranscript: StoredTranscriptEntry[] | null) => {
      storage.set('transcript', newTranscript ?? []);
    },
    []
  );

  const setAssetPath = useMutation(({ storage }, path: string) => {
    storage.set('assetPath', path);
  }, []);

  const updateStoryboardImageUrl = useMutation(
    ({ storage }, storyboardId: string, imageUrl: string | null) => {
      const currentStoryboards = storage.get(
        'storyboards'
      ) as StoredStoryboard[];
      const updated = currentStoryboards.map((sb) =>
        sb.id === storyboardId ? { ...sb, image_url: imageUrl } : sb
      );
      storage.set('storyboards', updated);
    },
    []
  );

  const updateStoryboardNotes = useMutation(
    ({ storage }, storyboardId: string, notes: string) => {
      const currentStoryboards = storage.get(
        'storyboards'
      ) as StoredStoryboard[];
      const updated = currentStoryboards.map((sb) =>
        sb.id === storyboardId ? { ...sb, notes } : sb
      );
      storage.set('storyboards', updated);
    },
    []
  );

  // Computed values (derived locally from storage)
  const transcriptSegments = useMemo<TranscriptSegment[]>(() => {
    if (!transcript || transcript.length === 0) {
      return [];
    }

    return transcript.map(
      (entry: StoredTranscriptEntry, entryIndex: number) => {
        const normalizedWords: TranscriptWordSegment[] = entry.words
          ? entry.words.map((word, wordIndex: number) => ({
              id: `${entry.id ?? `entry-${entryIndex}`}-word-${wordIndex}`,
              text: word.text,
              start:
                word.start !== null && word.start !== undefined
                  ? word.start / 1000
                  : null,
              end:
                word.end !== null && word.end !== undefined
                  ? word.end / 1000
                  : null,
            }))
          : [];

        const firstWordWithTime = normalizedWords.find(
          (word) => word.start !== null
        );
        const lastWordWithTime = [...normalizedWords]
          .reverse()
          .find((word) => word.end !== null);
        const startSeconds =
          firstWordWithTime?.start ??
          (entry.start !== null && entry.start !== undefined
            ? entry.start / 1000
            : null);
        const endSeconds =
          lastWordWithTime?.end ??
          (entry.end !== null && entry.end !== undefined
            ? entry.end / 1000
            : null);

        return {
          id: entry.id ?? `segment-${entryIndex}`,
          speaker: entry.speaker ?? null,
          text: entry.text,
          start: startSeconds,
          end: endSeconds,
          words: normalizedWords,
        };
      }
    );
  }, [transcript]);

  const transcriptContent = useMemo(() => {
    if (transcriptSegments.length === 0) {
      return '';
    }
    return transcriptSegments.map((segment) => segment.text).join('\n\n');
  }, [transcriptSegments]);

  const storyboardRanges = useMemo<StoryboardRange[]>(() => {
    if (!storyboards.length) {
      return [];
    }

    return storyboards
      .filter(
        (storyboard: StoredStoryboard) =>
          typeof storyboard.start === 'number' &&
          typeof storyboard.end === 'number'
      )
      .map((storyboard: StoredStoryboard) => ({
        id: storyboard.id,
        start: storyboard.start,
        end: storyboard.end,
      }))
      .sort((a: StoryboardRange, b: StoryboardRange) => a.start - b.start);
  }, [storyboards]);

  // Match structured transcript segments to a storyboard based on time ranges
  const getMatchedTranscript = (storyboard: StoryboardSceneProps) => {
    if (
      transcriptSegments.length === 0 ||
      storyboard.start === undefined ||
      storyboard.start === null ||
      storyboard.end === undefined ||
      storyboard.end === null ||
      typeof storyboard.start !== 'number' ||
      typeof storyboard.end !== 'number'
    ) {
      return [];
    }

    const storyboardStart = storyboard.start;
    const storyboardEnd = storyboard.end;

    return transcriptSegments.reduce<TranscriptSegment[]>(
      (matched, segment) => {
        if (segment.words.length > 0) {
          const matchingWords = segment.words.filter(
            (word) =>
              word.start !== null &&
              word.start >= storyboardStart &&
              word.start < storyboardEnd
          );

          if (matchingWords.length > 0) {
            const first = matchingWords[0];
            const last = matchingWords[matchingWords.length - 1];
            matched.push({
              id: `${segment.id}-${storyboard.id}-${first.id}`,
              speaker: segment.speaker,
              text: matchingWords.map((word) => word.text).join(' '),
              start: first.start,
              end: last.end,
              words: matchingWords,
            });
            return matched;
          }
        }

        if (
          segment.start !== null &&
          segment.start >= storyboardStart &&
          segment.start < storyboardEnd
        ) {
          matched.push(segment);
        }

        return matched;
      },
      []
    );
  };

  const transcriptCoverageGaps = useMemo<TranscriptCoverageGap[]>(() => {
    if (!storyboardRanges.length || !transcriptSegments.length) {
      return [];
    }

    const missing: TranscriptCoverageGap[] = [];

    transcriptSegments.forEach((segment) => {
      if (segment.words.length > 0) {
        const unmatchedWords = segment.words.filter((word) => {
          if (word.start === null) {
            return true;
          }

          return !storyboardRanges.some(
            (range) => word.start! >= range.start && word.start! < range.end
          );
        });

        if (unmatchedWords.length > 0) {
          const firstGapWord = unmatchedWords.find(
            (word) => word.start !== null || word.end !== null
          );
          const lastGapWord = [...unmatchedWords]
            .reverse()
            .find((word) => word.start !== null || word.end !== null);

          missing.push({
            id: `${segment.id}-gap`,
            speaker: segment.speaker,
            text: unmatchedWords.map((word) => word.text).join(' '),
            missingCount: unmatchedWords.length,
            totalCount: segment.words.length,
            start:
              firstGapWord?.start ?? firstGapWord?.end ?? segment.start ?? null,
            end: lastGapWord?.end ?? lastGapWord?.start ?? segment.end ?? null,
          });
        }

        return;
      }

      if (segment.start === null) {
        return;
      }

      const covered = storyboardRanges.some(
        (range) =>
          segment.start !== null &&
          segment.start >= range.start &&
          segment.start < range.end
      );

      if (!covered) {
        missing.push({
          id: `${segment.id}-gap`,
          speaker: segment.speaker,
          text: segment.text,
          missingCount: 1,
          totalCount: 1,
          start: segment.start,
          end: segment.end,
        });
      }
    });

    return missing;
  }, [storyboardRanges, transcriptSegments]);

  const coverageSummary = useMemo(() => {
    const missingCount = transcriptCoverageGaps.reduce(
      (sum, gap) => sum + gap.missingCount,
      0
    );

    const totalCount = transcriptSegments.reduce((sum, segment) => {
      if (segment.words.length > 0) {
        return sum + segment.words.length;
      }

      return segment.text.trim().length > 0 ? sum + 1 : sum;
    }, 0);

    return {
      missingCount,
      totalCount,
    };
  }, [transcriptCoverageGaps, transcriptSegments]);

  const hasFixableTranscriptGaps = useMemo(
    () =>
      transcriptCoverageGaps.some(
        (gap) =>
          typeof gap.start === 'number' &&
          typeof gap.end === 'number' &&
          gap.end > gap.start
      ),
    [transcriptCoverageGaps]
  );

  // Mutation: Split storyboards from transcript
  const handleSplitStoryboards = useMutation(({ storage }) => {
    const transcriptData = storage.get('transcript') as StoredTranscriptEntry[];
    if (!transcriptData || transcriptData.length === 0) return;

    const result: StoredStoryboard[] = [];
    let sentenceIndex = 0;

    // Process transcript segments
    const segments = transcriptData.map(
      (entry: StoredTranscriptEntry, entryIndex: number) => {
        const normalizedWords = entry.words
          ? entry.words.map((word, wordIndex: number) => ({
              id: `${entry.id ?? `entry-${entryIndex}`}-word-${wordIndex}`,
              text: word.text,
              start:
                word.start !== null && word.start !== undefined
                  ? word.start / 1000
                  : null,
              end:
                word.end !== null && word.end !== undefined
                  ? word.end / 1000
                  : null,
            }))
          : [];

        const firstWordWithTime = normalizedWords.find((w) => w.start !== null);
        const lastWordWithTime = [...normalizedWords]
          .reverse()
          .find((w) => w.end !== null);

        return {
          id: entry.id ?? `segment-${entryIndex}`,
          speaker: entry.speaker ?? null,
          text: entry.text,
          start:
            firstWordWithTime?.start ??
            (entry.start !== null && entry.start !== undefined
              ? entry.start / 1000
              : null),
          end:
            lastWordWithTime?.end ??
            (entry.end !== null && entry.end !== undefined
              ? entry.end / 1000
              : null),
          words: normalizedWords,
        };
      }
    );

    segments.forEach((segment) => {
      if (segment.words.length > 0) {
        let currentSentenceWords: typeof segment.words = [];

        segment.words.forEach((word) => {
          currentSentenceWords.push(word);

          if (word.text.trim().endsWith('.')) {
            if (currentSentenceWords.length > 0) {
              const firstWord = currentSentenceWords[0];
              const lastWord =
                currentSentenceWords[currentSentenceWords.length - 1];

              const start = firstWord.start ?? segment.start;
              const end = lastWord.end ?? segment.end;

              if (
                start !== null &&
                end !== null &&
                typeof start === 'number' &&
                typeof end === 'number'
              ) {
                const sentenceText = currentSentenceWords
                  .map((w) => w.text)
                  .join(' ')
                  .trim();

                if (sentenceText.length > 0) {
                  const title =
                    sentenceText.length > 60
                      ? `${sentenceText.slice(0, 57)}…`
                      : sentenceText;

                  result.push({
                    id: `sentence-${sentenceIndex}`,
                    title,
                    start,
                    end,
                  });
                  sentenceIndex++;
                }
              }
            }
            currentSentenceWords = [];
          }
        });

        // Handle remaining words
        if (currentSentenceWords.length > 0) {
          const firstWord = currentSentenceWords[0];
          const lastWord =
            currentSentenceWords[currentSentenceWords.length - 1];

          const start = firstWord.start ?? segment.start;
          const end = lastWord.end ?? segment.end;

          if (
            start !== null &&
            end !== null &&
            typeof start === 'number' &&
            typeof end === 'number'
          ) {
            const sentenceText = currentSentenceWords
              .map((w) => w.text)
              .join(' ')
              .trim();

            if (sentenceText.length > 0) {
              const title =
                sentenceText.length > 60
                  ? `${sentenceText.slice(0, 57)}…`
                  : sentenceText;

              result.push({
                id: `sentence-${sentenceIndex}`,
                title,
                start,
                end,
              });
              sentenceIndex++;
            }
          }
        }
      } else {
        // Segment has no words, split text on full stops
        const sentences = segment.text
          .split('.')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        sentences.forEach((sentence) => {
          const start = segment.start;
          const end = segment.end;

          if (
            start !== null &&
            end !== null &&
            typeof start === 'number' &&
            typeof end === 'number'
          ) {
            const sentenceWithPeriod = sentence.endsWith('.')
              ? sentence
              : `${sentence}.`;
            const title =
              sentenceWithPeriod.length > 60
                ? `${sentenceWithPeriod.slice(0, 57)}…`
                : sentenceWithPeriod;

            result.push({
              id: `sentence-${sentenceIndex}`,
              title,
              start,
              end,
            });
            sentenceIndex++;
          }
        });
      }
    });

    storage.set('storyboards', result);
  }, []);

  // Mutation: Fix missing transcript gaps
  const handleFixMissingTranscript = useMutation(
    ({ storage }) => {
      const currentStoryboards = storage.get(
        'storyboards'
      ) as StoredStoryboard[];
      const timestamp = Date.now();
      const fillerStoryboards: StoredStoryboard[] = [];

      transcriptCoverageGaps.forEach((gap, index) => {
        if (
          typeof gap.start !== 'number' ||
          typeof gap.end !== 'number' ||
          gap.end <= gap.start
        ) {
          return;
        }

        const gapStart = gap.start;
        const gapEnd = gap.end;

        const overlapsExisting = currentStoryboards.some(
          (storyboard) =>
            typeof storyboard.start === 'number' &&
            typeof storyboard.end === 'number' &&
            storyboard.start <= gapStart &&
            storyboard.end >= gapEnd
        );

        if (overlapsExisting) {
          return;
        }

        fillerStoryboards.push({
          id: `gap-${timestamp}-${index}`,
          title:
            gap.text.trim().length > 0
              ? `Gap: ${
                  gap.text.length > 60
                    ? `${gap.text.slice(0, 57)}…`
                    : gap.text.trim()
                }`
              : `Transcript gap ${index + 1}`,
          start: gapStart,
          end: gapEnd,
        });
      });

      if (fillerStoryboards.length > 0) {
        storage.set('storyboards', [
          ...currentStoryboards,
          ...fillerStoryboards,
        ]);
      }
    },
    [transcriptCoverageGaps]
  );

  // Mutation: Reset storyboards
  const resetStoryboards = useMutation(({ storage }) => {
    storage.set('storyboards', []);
  }, []);

  // Mutation: Split a storyboard at a specific time
  const splitStoryboard = useMutation(
    ({ storage }, storyboardId: string, splitTime: number) => {
      const currentStoryboards = storage.get(
        'storyboards'
      ) as StoredStoryboard[];
      const storyboard = currentStoryboards.find(
        (sb) => sb.id === storyboardId
      );

      if (!storyboard) return;
      if (
        typeof storyboard.start !== 'number' ||
        typeof storyboard.end !== 'number'
      )
        return;
      if (splitTime <= storyboard.start || splitTime >= storyboard.end) return;

      const matchedTranscript = getMatchedTranscript(
        storyboard as StoryboardSceneProps
      );

      const firstPartSegments = matchedTranscript.filter((segment) => {
        if (segment.words.length > 0) {
          return segment.words.some(
            (word) =>
              word.start !== null &&
              word.start >= storyboard.start &&
              word.start < splitTime
          );
        }
        return (
          segment.start !== null &&
          segment.start >= storyboard.start &&
          segment.start < splitTime
        );
      });

      const secondPartSegments = matchedTranscript.filter((segment) => {
        if (segment.words.length > 0) {
          return segment.words.some(
            (word) =>
              word.start !== null &&
              word.start >= splitTime &&
              word.start <= storyboard.end
          );
        }
        return (
          segment.start !== null &&
          segment.start >= splitTime &&
          segment.start <= storyboard.end
        );
      });

      const getTitleFromSegments = (segments: TranscriptSegment[]): string => {
        if (segments.length === 0) return storyboard.title;
        const text = segments
          .map((seg) => seg.text)
          .join(' ')
          .trim();
        if (text.length === 0) return storyboard.title;
        return text.length > 60 ? `${text.slice(0, 57)}…` : text;
      };

      const updatedOriginal: StoredStoryboard = {
        ...storyboard,
        title: getTitleFromSegments(firstPartSegments),
        end: splitTime,
      };

      const newStoryboard: StoredStoryboard = {
        id: `${storyboardId}-split-${Date.now()}`,
        title: getTitleFromSegments(secondPartSegments),
        start: splitTime,
        end: storyboard.end,
      };

      const index = currentStoryboards.findIndex(
        (sb) => sb.id === storyboardId
      );
      if (index === -1) return;

      const newStoryboards = [...currentStoryboards];
      newStoryboards[index] = updatedOriginal;
      newStoryboards.splice(index + 1, 0, newStoryboard);

      storage.set('storyboards', newStoryboards);
    },
    [getMatchedTranscript]
  );

  // Mutation: Merge storyboards
  const mergeStoryboard = useMutation(
    ({ storage }, storyboardId: string, direction: 'up' | 'down') => {
      const currentStoryboards = storage.get(
        'storyboards'
      ) as StoredStoryboard[];
      const index = currentStoryboards.findIndex(
        (sb) => sb.id === storyboardId
      );
      if (index === -1) return;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentStoryboards.length) return;

      const current = currentStoryboards[index];
      const adjacent = currentStoryboards[targetIndex];

      const newStart = Math.min(current.start, adjacent.start);
      const newEnd = Math.max(current.end, adjacent.end);

      const newTitle =
        direction === 'up'
          ? `${adjacent.title} ${current.title}`
          : `${current.title} ${adjacent.title}`;

      const finalTitle =
        newTitle.length > 80 ? `${newTitle.slice(0, 77)}...` : newTitle;

      const mergedStoryboard: StoredStoryboard = {
        id: `merged-${Date.now()}-${index}`,
        title: finalTitle,
        start: newStart,
        end: newEnd,
      };

      const newStoryboards = [...currentStoryboards];
      const removeIndex = Math.min(index, targetIndex);
      newStoryboards.splice(removeIndex, 2, mergedStoryboard);

      storage.set('storyboards', newStoryboards);
    },
    []
  );

  // Cast storyboards to the expected type for components
  const typedStoryboards = storyboards as StoryboardSceneProps[];

  return {
    // Storage data
    storyboards: typedStoryboards,
    transcript,
    assetPath,
    // Computed values
    transcriptSegments,
    transcriptContent,
    transcriptCoverageGaps,
    coverageSummary,
    hasFixableTranscriptGaps,
    // Mutations
    setStoryboards,
    setTranscript,
    setAssetPath,
    getMatchedTranscript,
    handleSplitStoryboards,
    handleFixMissingTranscript,
    resetStoryboards,
    splitStoryboard,
    mergeStoryboard,
    updateStoryboardImageUrl,
    updateStoryboardNotes,
  };
}
