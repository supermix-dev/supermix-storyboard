import { getLiveblocksClient } from '@/lib/liveblocks';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type RoomStatus = 'draft' | 'active' | 'archived';

export type RoomData = {
  id: string;
  name: string;
  createdAt: string;
  status: RoomStatus;
};

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liveblocks = getLiveblocksClient();

    // Fetch all rooms from Liveblocks
    const { data: rooms } = await liveblocks.getRooms();

    // Map rooms to our format, extracting name from metadata
    const roomData: RoomData[] = rooms.map((room) => ({
      id: room.id,
      name: (room.metadata?.name as string) || room.id,
      createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
      status: (room.metadata?.status as RoomStatus) || 'draft',
    }));

    // Sort by creation date (newest first)
    roomData.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ rooms: roomData });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
