import { currentUser } from '@clerk/nextjs/server';
import { getLiveblocksClient } from '@/lib/liveblocks';
import { NextRequest, NextResponse } from 'next/server';

// Generate random colors for users
const COLORS = [
  '#E57373',
  '#F06292',
  '#BA68C8',
  '#9575CD',
  '#7986CB',
  '#64B5F6',
  '#4FC3F7',
  '#4DD0E1',
  '#4DB6AC',
  '#81C784',
  '#AED581',
  '#DCE775',
  '#FFF176',
  '#FFD54F',
  '#FFB74D',
  '#FF8A65',
  '#A1887F',
  '#90A4AE',
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const user = await currentUser();
    console.log('user', user);
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const liveblocks = getLiveblocksClient();

    // Use the authenticated user's info
    const userName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
      : user.username || user.emailAddresses[0]?.emailAddress || 'Anonymous';

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: userName,
        color: getRandomColor(),
        avatar: user.imageUrl,
      },
    });

    // Get room from request body
    const body = await request.json();
    const { room } = body;

    if (room) {
      // Grant full access to the requested room
      session.allow(room, session.FULL_ACCESS);
    } else {
      // Allow access to all rooms (for development)
      session.allow('*', session.FULL_ACCESS);
    }

    const { status, body: responseBody } = await session.authorize();
    return new NextResponse(responseBody, { status });
  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
