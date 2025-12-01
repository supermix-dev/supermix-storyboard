import { getLiveblocksClient } from '@/lib/liveblocks';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { RoomDashboard } from './room-dashboard';

export type RoomStatus = 'draft' | 'active' | 'archived';

export type RoomData = {
  id: string;
  name: string;
  createdAt: string;
  status: RoomStatus;
};

async function getRooms(): Promise<RoomData[]> {
  const liveblocks = getLiveblocksClient();
  const { data: rooms } = await liveblocks.getRooms();

  const roomData: RoomData[] = rooms.map((room) => ({
    id: room.id,
    name: (room.metadata?.name as string) || room.id,
    createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
    status: (room.metadata?.status as RoomStatus) || 'draft',
  }));

  // Sort by creation date (newest first)
  roomData.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return roomData;
}

export default async function Home() {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const rooms = await getRooms();

  return <RoomDashboard initialRooms={rooms} />;
}
