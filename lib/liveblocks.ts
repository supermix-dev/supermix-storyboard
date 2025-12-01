import { Liveblocks } from '@liveblocks/node';

let liveblocksClient: Liveblocks | null = null;

export function getLiveblocksClient(): Liveblocks {
  if (liveblocksClient) {
    return liveblocksClient;
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error('LIVEBLOCKS_SECRET_KEY environment variable is not set');
  }

  liveblocksClient = new Liveblocks({ secret });
  return liveblocksClient;
}

