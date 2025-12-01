'use client';

import { RoomProvider as LiveblocksRoomProvider } from '@/liveblocks.config';
import { ClientSideSuspense } from '@liveblocks/react/suspense';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
type StoryboardRoomProviderProps = {
  roomId: string;
  children: ReactNode;
};

function RoomContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-dvh">
      <div className="text-center space-y-4">
        <Loader2 className="size-4 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting to room</p>
      </div>
    </div>
  );
}

export function StoryboardRoomProvider({
  roomId,
  children,
}: StoryboardRoomProviderProps) {
  return (
    <LiveblocksRoomProvider
      id={roomId}
      initialPresence={{
        selectedStoryboardId: null,
        cursor: null,
      }}
      initialStorage={{
        storyboards: [],
        transcript: [],
        assetPath: '',
      }}
    >
      <ClientSideSuspense fallback={<LoadingState />}>
        {() => <RoomContent>{children}</RoomContent>}
      </ClientSideSuspense>
    </LiveblocksRoomProvider>
  );
}
