import { type StoryboardSceneProps } from '@/app/actions/storyboards';
import type { ShadeTranscriptEntry } from '@/lib/shade/shade.types';
import { useMemo, useState, useTransition } from 'react';

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

export function useStoryboards(
  transcript: ShadeTranscriptEntry[] | null | undefined
) {
  const [storyboards, setStoryboards] = useState<StoryboardSceneProps[]>([]);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [isSplitting, startSplitting] = useTransition();

  const transcriptSegments = useMemo<TranscriptSegment[]>(() => {
    if (!transcript || transcript.length === 0) {
      return [];
    }

    return transcript.map((entry, entryIndex) => {
      const normalizedWords: TranscriptWordSegment[] = entry.words
        ? entry.words.map((word, wordIndex) => ({
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
    });
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
        (storyboard) =>
          typeof storyboard.start === 'number' &&
          typeof storyboard.end === 'number'
      )
      .map((storyboard) => ({
        id: storyboard.id,
        start: storyboard.start as number,
        end: storyboard.end as number,
      }))
      .sort((a, b) => a.start - b.start);
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

  const handleSplitStoryboards = () => {
    if (!transcript) {
      setStoryboardError(
        'A transcript is required before creating storyboards.'
      );
      return;
    }

    setStoryboardError(null);

    startSplitting(async () => {
      try {
        // const result = await splitTranscriptIntoStoryboards(transcript ?? []);
        const result: StoryboardSceneProps[] = [];

        if (transcriptSegments.length > 0) {
          let sentenceIndex = 0;

          // Process each transcript segment and split on full stops
          transcriptSegments.forEach((segment) => {
            // Split segment text on full stops
            const sentences = segment.text
              .split('.')
              .map((sentence) => sentence.trim())
              .filter((sentence) => sentence.length > 0);

            if (sentences.length === 0) {
              return;
            }

            // If segment has words, split them by sentences
            if (segment.words.length > 0) {
              let currentSentenceWords: TranscriptWordSegment[] = [];

              segment.words.forEach((word) => {
                currentSentenceWords.push(word);

                // Check if word ends with a period (full stop)
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

              // Handle remaining words if segment doesn't end with a period
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
              // If segment has no words, split text and use segment timing
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
        }

        setStoryboards(result);
      } catch (err) {
        setStoryboards([]);
        setStoryboardError(
          err instanceof Error
            ? err.message
            : 'Failed to split transcript into storyboards.'
        );
      }
    });
  };

  const handleFixMissingTranscript = () => {
    if (!transcriptCoverageGaps.length) {
      return;
    }

    const timestamp = Date.now();
    const fillerStoryboards: StoryboardSceneProps[] = [];

    transcriptCoverageGaps.forEach((gap, index) => {
      if (
        typeof gap.start !== 'number' ||
        typeof gap.end !== 'number' ||
        gap.end <= gap.start
      ) {
        return;
      }

      const gapStart = gap.start as number;
      const gapEnd = gap.end as number;

      const overlapsExisting = storyboards.some(
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

    if (fillerStoryboards.length === 0) {
      return;
    }

    setStoryboards((prev) => [...prev, ...fillerStoryboards]);
  };

  const resetStoryboards = () => {
    setStoryboards([]);
    setStoryboardError(null);
  };

  const splitStoryboard = (storyboardId: string, splitTime: number) => {
    const storyboard = storyboards.find((sb) => sb.id === storyboardId);

    if (!storyboard) {
      setStoryboardError(`Storyboard with id "${storyboardId}" not found.`);
      return;
    }

    if (
      typeof storyboard.start !== 'number' ||
      typeof storyboard.end !== 'number'
    ) {
      setStoryboardError('Cannot split storyboard: missing start or end time.');
      return;
    }

    if (splitTime <= storyboard.start || splitTime >= storyboard.end) {
      setStoryboardError(
        `Split time must be between ${storyboard.start.toFixed(
          2
        )}s and ${storyboard.end.toFixed(2)}s.`
      );
      return;
    }

    // Get matched transcript for the original storyboard
    const matchedTranscript = getMatchedTranscript(storyboard);

    // Find words/segments for first and second parts
    const firstPartSegments = matchedTranscript.filter((segment) => {
      if (segment.words.length > 0) {
        return segment.words.some(
          (word) =>
            word.start !== null &&
            word.start >= storyboard.start! &&
            word.start < splitTime
        );
      }
      return (
        segment.start !== null &&
        segment.start >= storyboard.start! &&
        segment.start < splitTime
      );
    });

    const secondPartSegments = matchedTranscript.filter((segment) => {
      if (segment.words.length > 0) {
        return segment.words.some(
          (word) =>
            word.start !== null &&
            word.start >= splitTime &&
            word.start <= storyboard.end!
        );
      }
      return (
        segment.start !== null &&
        segment.start >= splitTime &&
        segment.start <= storyboard.end!
      );
    });

    // Generate titles from transcript segments
    const getTitleFromSegments = (segments: TranscriptSegment[]): string => {
      if (segments.length === 0) {
        return storyboard.title;
      }

      const text = segments
        .map((seg) => seg.text)
        .join(' ')
        .trim();

      if (text.length === 0) {
        return storyboard.title;
      }

      return text.length > 60 ? `${text.slice(0, 57)}…` : text;
    };

    const firstPartTitle = getTitleFromSegments(firstPartSegments);
    const secondPartTitle = getTitleFromSegments(secondPartSegments);

    // Update the original storyboard to end at splitTime
    const updatedOriginal: StoryboardSceneProps = {
      ...storyboard,
      title: firstPartTitle,
      end: splitTime,
    };

    // Create the new storyboard for the second part
    const newStoryboard: StoryboardSceneProps = {
      id: `${storyboardId}-split-${Date.now()}`,
      title: secondPartTitle,
      start: splitTime,
      end: storyboard.end,
    };

    // Update the original and insert the new one after it
    setStoryboards((prev) => {
      const index = prev.findIndex((sb) => sb.id === storyboardId);
      if (index === -1) {
        return prev;
      }

      const newStoryboards = [...prev];
      newStoryboards[index] = updatedOriginal;
      newStoryboards.splice(index + 1, 0, newStoryboard);
      return newStoryboards;
    });

    setStoryboardError(null);
  };

  const mergeStoryboard = (storyboardId: string, direction: 'up' | 'down') => {
    const index = storyboards.findIndex((sb) => sb.id === storyboardId);
    if (index === -1) {
      setStoryboardError(`Storyboard with id "${storyboardId}" not found.`);
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= storyboards.length) {
      setStoryboardError(
        `Cannot merge ${direction}: no adjacent storyboard found.`
      );
      return;
    }

    const current = storyboards[index];
    const adjacent = storyboards[targetIndex];

    // Determine the new start and end times
    const newStart = Math.min(current.start, adjacent.start);
    const newEnd = Math.max(current.end, adjacent.end);

    // Combine titles (simplified)
    const newTitle =
      direction === 'up'
        ? `${adjacent.title} ${current.title}`
        : `${current.title} ${adjacent.title}`;

    // Truncate title if too long
    const finalTitle =
      newTitle.length > 80 ? `${newTitle.slice(0, 77)}...` : newTitle;

    const mergedStoryboard: StoryboardSceneProps = {
      id: `merged-${Date.now()}-${index}`,
      title: finalTitle,
      start: newStart,
      end: newEnd,
    };

    setStoryboards((prev) => {
      const newStoryboards = [...prev];
      // Remove both and insert the merged one at the lower index
      const removeIndex = Math.min(index, targetIndex);
      newStoryboards.splice(removeIndex, 2, mergedStoryboard);
      return newStoryboards;
    });

    setStoryboardError(null);
  };

  const updateStoryboardImageUrl = (
    storyboardId: string,
    imageUrl: string | null
  ) => {
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === storyboardId ? { ...sb, image_url: imageUrl } : sb
      )
    );
  };

  return {
    storyboards,
    storyboardError,
    isSplitting,
    transcriptSegments,
    transcriptContent,
    transcriptCoverageGaps,
    coverageSummary,
    hasFixableTranscriptGaps,
    getMatchedTranscript,
    handleSplitStoryboards,
    handleFixMissingTranscript,
    resetStoryboards,
    splitStoryboard,
    mergeStoryboard,
    updateStoryboardImageUrl,
    setStoryboards,
  };
}
