import { createClient } from '@liveblocks/client';
import { createLiveblocksContext, createRoomContext } from '@liveblocks/react';

// Create the Liveblocks client
const client = createClient({
  authEndpoint: '/api/liveblocks-auth',
});

// Storyboard type for storage (must be JSON-serializable)
export type StoredStoryboard = {
  id: string;
  title: string;
  start: number;
  end: number;
  image_url?: string | null;
  notes?: string;
};

// Transcript word for storage
export type StoredTranscriptWord = {
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
};

// Transcript entry for storage
export type StoredTranscriptEntry = {
  id?: string;
  speaker?: string | null;
  start?: number;
  end?: number;
  text: string;
  words?: StoredTranscriptWord[];
};

// Presence - what each user is currently doing
export type Presence = {
  // Which storyboard card the user is currently viewing/editing
  selectedStoryboardId: string | null;
  // User's cursor position (optional, for preview mode)
  cursor: { x: number; y: number } | null;
};

// User metadata from auth
export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar?: string;
  };
};

// Storage - the persisted collaborative data (must be JSON-serializable)
export type Storage = {
  storyboards: StoredStoryboard[];
  transcript: StoredTranscriptEntry[];
  assetPath: string;
};

// Room event types (optional)
export type RoomEvent = {
  type: 'STORYBOARD_UPDATED';
  storyboardId: string;
};

export type ThreadMetadata = {
  resolved: boolean;
  storyboardId?: string;
};

// Create typed room context
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthersMapped,
    useOthers,
    useSelf,
    useStorage,
    useMutation,
    useStatus,
    useBroadcastEvent,
    useEventListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(
  client
);

// Create Liveblocks context for dashboard features
export const {
  suspense: { LiveblocksProvider, useRoomInfo },
} = createLiveblocksContext(client);
