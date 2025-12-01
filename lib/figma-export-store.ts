import { Redis } from '@upstash/redis';

const EXPORT_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const EXPORT_KEY_PREFIX = 'figma-export:';

const upstashConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = upstashConfigured ? Redis.fromEnv() : null;

function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export type FigmaExportPayload = {
  meta: {
    generatedAt: string;
    totalStoryboards: number;
    transcriptIncluded: boolean;
  };
  storyboards: Array<{
    id: string;
    title: string;
    start: number;
    end: number;
    image_url?: string | null;
    imageUrl?: string | null;
    notes?: string;
    transcriptText?: string;
  }>;
  transcript?: string;
};

export type SaveExportResult = {
  success: true;
  id: string;
} | {
  success: false;
  error: string;
};

export type GetExportResult = {
  success: true;
  payload: FigmaExportPayload;
} | {
  success: false;
  error: string;
};

export async function saveExport(
  payload: FigmaExportPayload
): Promise<SaveExportResult> {
  if (!redis) {
    return {
      success: false,
      error: 'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
    };
  }

  const id = generateShortId();
  const key = `${EXPORT_KEY_PREFIX}${id}`;

  try {
    await redis.set(key, JSON.stringify(payload), { ex: EXPORT_TTL_SECONDS });
    return { success: true, id };
  } catch (error) {
    console.error('Failed to save Figma export to Redis:', error);
    return {
      success: false,
      error: 'Failed to save export. Please try again.',
    };
  }
}

export async function getExport(id: string): Promise<GetExportResult> {
  if (!redis) {
    return {
      success: false,
      error: 'Redis is not configured.',
    };
  }

  if (!id || typeof id !== 'string' || id.length < 4) {
    return {
      success: false,
      error: 'Invalid export ID.',
    };
  }

  const key = `${EXPORT_KEY_PREFIX}${id}`;

  try {
    const data = await redis.get<string>(key);

    if (!data) {
      return {
        success: false,
        error: 'Export not found or has expired.',
      };
    }

    const payload: FigmaExportPayload =
      typeof data === 'string' ? JSON.parse(data) : data;

    return { success: true, payload };
  } catch (error) {
    console.error('Failed to retrieve Figma export from Redis:', error);
    return {
      success: false,
      error: 'Failed to retrieve export.',
    };
  }
}

