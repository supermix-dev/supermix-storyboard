import type { RoomStatus } from '@/app/page';
import { StoryboardRoomProvider } from '@/components/liveblocks/room-provider';
import { getLiveblocksClient } from '@/lib/liveblocks';
import { StoryboardEditor } from './editor';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getRoomData(roomId: string) {
  const liveblocks = getLiveblocksClient();
  const room = await liveblocks.getRoom(roomId);

  return {
    name: (room.metadata?.name as string) || room.id,
    status: (room.metadata?.status as RoomStatus) || 'draft',
  };
}

export default async function StoryboardPage({ params }: PageProps) {
  const { id } = await params;
  const roomData = await getRoomData(id);

  return (
    <StoryboardRoomProvider roomId={id}>
      <StoryboardEditor
        roomId={id}
        initialRoomName={roomData.name}
        initialRoomStatus={roomData.status}
      />
    </StoryboardRoomProvider>
  );
}
