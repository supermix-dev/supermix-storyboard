'use server';

import { generateObject } from 'ai';
import { z } from 'zod';

import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from '@/lib/ai/client';
import { ShadeTranscriptEntry } from '../../lib/shade/shade.types';

type StructuredTranscriptSentence = {
  utteranceId: string;
  text: string;
  start: number | null;
  end: number | null;
  speaker: string | null;
  wordCount: number;
};

const StoryboardScenePropsSchema = z.object({
  id: z
    .string()
    .min(1, 'Storyboard id is required')
    .describe('A unique identifier for the storyboard segment'),
  title: z
    .string()
    .min(1, 'Storyboard title is required')
    .describe('Concise descriptive title'),
  start: z
    .number()
    .min(0, 'Start timecode must be zero or positive')
    .describe('exact start in seconds'),
  end: z
    .number()
    .min(0, 'End timecode must be zero or positive')
    .describe('exact end in seconds'),
});

const storyboardResponseSchema = z.object({
  storyboards: z
    .array(StoryboardScenePropsSchema)
    .min(1)
    .max(15)
    .describe('Storyboard objects covering the transcript'),
});

export type StoryboardSceneProps = {
  id: string;
  title: string;
  start: number;
  end: number;
  image_url?: string | null;
  notes?: string;
};

export async function splitTranscriptIntoStoryboards(
  transcript: ShadeTranscriptEntry[]
): Promise<StoryboardSceneProps[]> {
  if (!transcript || transcript.length === 0) {
    throw new Error('Transcript text is required to create storyboards.');
  }

  const structuredTranscript: StructuredTranscriptSentence[] =
    transcript.flatMap((entry, entryIndex) => {
      const utteranceId = entry.id ?? `utterance-${entryIndex}`;
      const utteranceStart =
        entry.start !== null && entry.start !== undefined
          ? entry.start / 1000
          : null;
      const utteranceEnd =
        entry.end !== null && entry.end !== undefined ? entry.end / 1000 : null;
      const speaker = entry.speaker ?? null;

      const buildSentence = (sentenceWords: typeof entry.words) => {
        if (!sentenceWords || sentenceWords.length === 0) {
          return null;
        }

        const normalizedWords = sentenceWords.map((word) => ({
          text: word.text,
          start:
            word.start !== null && word.start !== undefined
              ? word.start / 1000
              : null,
          end:
            word.end !== null && word.end !== undefined
              ? word.end / 1000
              : null,
        }));

        const firstWordWithTime = normalizedWords.find(
          (word) => word.start !== null
        );
        const lastWordWithTime = [...normalizedWords]
          .reverse()
          .find((word) => word.end !== null);

        const sentenceStart =
          firstWordWithTime?.start ??
          normalizedWords[0]?.start ??
          utteranceStart;
        const sentenceEnd =
          lastWordWithTime?.end ??
          normalizedWords[normalizedWords.length - 1]?.end ??
          utteranceEnd;

        const sentenceText = normalizedWords.map((word) => word.text).join(' ');

        return {
          utteranceId,
          text: sentenceText.trim(),
          start: sentenceStart,
          end: sentenceEnd,
          speaker,
          wordCount: normalizedWords.length,
        };
      };

      if (!entry.words?.length) {
        const sentences = entry.text
          .split('.')
          .map((sentence) => sentence.trim())
          .filter(Boolean);

        if (sentences.length === 0) {
          return [];
        }

        return sentences.map((sentence, sentenceIndex) => ({
          utteranceId: `${utteranceId}-sentence-${sentenceIndex}`,
          text: `${sentence}.`,
          start: utteranceStart,
          end:
            sentenceIndex === sentences.length - 1
              ? utteranceEnd
              : utteranceStart,
          speaker,
          wordCount: 0,
        }));
      }

      const sentences: StructuredTranscriptSentence[] = [];
      let currentSentence: typeof entry.words = [];

      const flushSentence = () => {
        const built = buildSentence(currentSentence);
        if (built) {
          sentences.push({
            ...built,
            utteranceId: `${utteranceId}-sentence-${sentences.length}`,
          });
        }
        currentSentence = [];
      };

      for (const word of entry.words) {
        currentSentence.push(word);

        if (word.text.trim().endsWith('.')) {
          flushSentence();
        }
      }

      if (currentSentence.length > 0) {
        flushSentence();
      }

      return sentences;
    });

  const transcriptJson = JSON.stringify(structuredTranscript, null, 2);

  console.log('structuredTranscript', structuredTranscript);

  const openai = getOpenAIClient();

  try {
    const { object } = await generateObject({
      model: openai(DEFAULT_OPENAI_MODEL),
      schema: storyboardResponseSchema,
      prompt: [
        'You are a senior storyboard artist.',
        'Turn the structured transcript JSON into coherent storyboard segments.',
        'Each segment must include: title, start time, and end time.',
        'IDs should be short kebab-case strings derived from the content.',
        'Respect chronological order and cover the entire transcript without gaps.',
        'Group related sentences together into meaningful storyboard segments.',
        'IMPORTANT: You MUST return exactly 15 or fewer storyboard segments. If the transcript is long,',
        'group multiple related sentences together to stay within the 15-item limit.',

        `here's the structured transcript with sentences:
          \`\`\`json
          ${transcriptJson}
          \`\`\`
          Please return the storyboards with start and end times in seconds.
          Remember: Maximum of 15 storyboard segments.
          `,
      ].join('\n'),
    });

    return object.storyboards;
  } catch (error: unknown) {
    // If the AI generated too many storyboards, try to extract and truncate
    const errorObj = error as {
      cause?: { value?: { storyboards?: unknown[] } };
    };
    if (
      errorObj?.cause?.value?.storyboards &&
      Array.isArray(errorObj.cause.value.storyboards)
    ) {
      const storyboards = errorObj.cause.value.storyboards.slice(0, 15);
      console.warn(
        `AI generated ${errorObj.cause.value.storyboards.length} storyboards, truncating to 15`
      );
      // Validate the truncated storyboards match the schema
      const validated = storyboardResponseSchema.parse({
        storyboards,
      });
      return validated.storyboards;
    }
    throw error;
  }
}
