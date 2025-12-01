'use server';

import { getLiveblocksClient } from '@/lib/liveblocks';
import { currentUser } from '@clerk/nextjs/server';

export type RoomStatus = 'draft' | 'active' | 'archived';

function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

export async function createRoom(name: string, assetPath?: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Room name is required');
  }

  const liveblocks = getLiveblocksClient();
  const roomId = generateRoomId();

  // Create the room with metadata
  await liveblocks.createRoom(roomId, {
    defaultAccesses: ['room:write'],
    metadata: {
      name: name.trim(),
      createdBy: user.id,
      status: 'draft',
    },
  });

  // Initialize storage with asset path if provided
  if (assetPath && typeof assetPath === 'string' && assetPath.trim()) {
    await liveblocks.initializeStorageDocument(roomId, {
      liveblocksType: 'LiveObject',
      data: {
        storyboards: { liveblocksType: 'LiveList', data: [] },
        transcript: { liveblocksType: 'LiveList', data: [] },
        assetPath: assetPath.trim(),
      },
    });
  }

  return {
    id: roomId,
    name: name.trim(),
  };
}

export async function updateRoom(
  roomId: string,
  data: { status?: RoomStatus; name?: string }
) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { status, name } = data;

  // Need at least one field to update
  if (!status && !name) {
    throw new Error('Must provide status or name to update.');
  }

  // Validate status if provided
  const validStatuses: RoomStatus[] = ['draft', 'active', 'archived'];
  if (status && !validStatuses.includes(status)) {
    throw new Error('Invalid status. Must be draft, active, or archived.');
  }

  // Validate name if provided
  if (
    name !== undefined &&
    (typeof name !== 'string' || name.trim().length === 0)
  ) {
    throw new Error('Name must be a non-empty string.');
  }

  const liveblocks = getLiveblocksClient();

  // Get current room to preserve existing metadata
  const room = await liveblocks.getRoom(roomId);

  // Build updated metadata
  const updatedMetadata = {
    ...room.metadata,
    ...(status && { status }),
    ...(name && { name: name.trim() }),
  };

  // Update room
  await liveblocks.updateRoom(roomId, {
    metadata: updatedMetadata,
  });

  return {
    id: roomId,
    status: updatedMetadata.status as RoomStatus,
    name: updatedMetadata.name as string,
  };
}

