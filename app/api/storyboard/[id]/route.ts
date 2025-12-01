import { getLiveblocksClient } from '@/lib/liveblocks';
import { NextRequest, NextResponse } from 'next/server';

import type {
  StoredStoryboard,
  StoredTranscriptEntry,
} from '@/liveblocks.config';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type RoomStorage = {
  liveblocksType: 'LiveObject';
  data: {
    storyboards?: StoredStoryboard[];
    transcript?: StoredTranscriptEntry[];
    assetPath?: string;
  };
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;

  if (!roomId || typeof roomId !== 'string' || roomId.length < 1) {
    return NextResponse.json(
      { error: 'Storyboard ID is required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const liveblocks = getLiveblocksClient();

    // Fetch the room storage
    const storageData = await liveblocks.getStorageDocument(roomId, 'json');

    if (!storageData) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // The storage document comes as a LiveObject wrapper
    const storage = storageData as RoomStorage;
    const data = storage.data || {};

    const storyboards = data.storyboards || [];

    if (storyboards.length === 0) {
      return NextResponse.json(
        { error: 'No storyboards found in this room' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Build transcript content from segments
    const transcript = data.transcript || [];
    const transcriptContent = transcript
      .map((entry) => entry.text)
      .filter((text) => text && text.trim().length > 0)
      .join('\n\n');

    // Transform storyboards to export format with transcript text
    const exportableStoryboards = storyboards.map((sb) => {
      // Match transcript segments to this storyboard's time range
      const matchedSegments = getMatchedTranscriptSegments(sb, transcript);
      const transcriptText = matchedSegments
        .map((segment) => {
          const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
          return `${speakerPrefix}${segment.text}`.trim();
        })
        .filter((line) => line.length > 0)
        .join('\n');

      return {
        id: sb.id,
        title: sb.title,
        start: sb.start,
        end: sb.end,
        image_url: sb.image_url || null,
        imageUrl: sb.image_url || null,
        notes: sb.notes,
        transcriptText: transcriptText.length > 0 ? transcriptText : undefined,
      };
    });

    // Build the payload in the same format as FigmaExportPayload
    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        totalStoryboards: exportableStoryboards.length,
        transcriptIncluded: transcriptContent.length > 0,
      },
      storyboards: exportableStoryboards,
      transcript: transcriptContent.length > 0 ? transcriptContent : undefined,
    };

    return NextResponse.json(payload, {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching storyboard from Liveblocks:', error);

    // Check if it's a "room not found" type error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist')
    ) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch storyboard' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Helper to match transcript segments to a storyboard's time range
function getMatchedTranscriptSegments(
  storyboard: StoredStoryboard,
  transcript: StoredTranscriptEntry[]
): StoredTranscriptEntry[] {
  if (
    !transcript.length ||
    typeof storyboard.start !== 'number' ||
    typeof storyboard.end !== 'number'
  ) {
    return [];
  }

  const storyboardStart = storyboard.start;
  const storyboardEnd = storyboard.end;

  return transcript.filter((entry) => {
    // Check word-level timing first
    if (entry.words && entry.words.length > 0) {
      return entry.words.some((word) => {
        const wordStart = word.start !== undefined ? word.start / 1000 : null;
        return (
          wordStart !== null &&
          wordStart >= storyboardStart &&
          wordStart < storyboardEnd
        );
      });
    }

    // Fall back to segment-level timing
    const segmentStart = entry.start !== undefined ? entry.start / 1000 : null;
    return (
      segmentStart !== null &&
      segmentStart >= storyboardStart &&
      segmentStart < storyboardEnd
    );
  });
}
