import { getLiveblocksClient } from '@/lib/liveblocks';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export type RoomStatus = 'draft' | 'active' | 'archived';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const liveblocks = getLiveblocksClient();

    const room = await liveblocks.getRoom(id);

    return NextResponse.json({
      id: room.id,
      name: (room.metadata?.name as string) || room.id,
      status: (room.metadata?.status as RoomStatus) || 'draft',
      createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}
