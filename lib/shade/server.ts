'use server';

import type {
  JwtPayload,
  ShadeAssetDto,
  ShadeAssetProps,
  ShadeConfig,
  ShadeSession,
  ShadeTokenResponse,
  ShadeTranscriptEntry,
} from './shade.types';

const SHADE_API_BASE_URL = process.env.SHADE_API_URL || 'https://api.shade.inc';
const SHADE_FS_BASE_URL = process.env.SHADE_FS_URL || 'https://fs.shade.inc';

export async function getShadeConfig(): Promise<ShadeConfig> {
  const apiKey = process.env.SHADE_API_KEY;
  const driveId = '3374366f-293a-4ab4-871e-ccd64eeba320';

  if (!apiKey) {
    throw new Error('SHADE_API_KEY environment variable is not set');
  }
  if (!driveId) {
    throw new Error('SHADE_DRIVE_ID environment variable is not set');
  }

  return { apiKey, driveId };
}

export async function fetchShadeFsToken(): Promise<ShadeSession> {
  const { apiKey, driveId } = await getShadeConfig();
  const response = await fetch(
    `${SHADE_API_BASE_URL}/workspaces/drives/${driveId}/shade-fs-token`,
    {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const message = await safeReadErrorMessage(response);
    throw new Error(
      `Failed to fetch ShadeFS token (${response.status}): ${message}`
    );
  }

  const data = (await response.json()) as ShadeTokenResponse;
  if (!data?.token) {
    throw new Error('ShadeFS token response did not include a token');
  }

  const payload = decodeJwtPayload(data.token);
  const email = typeof payload.sub === 'string' ? payload.sub : '';
  const expiresAt =
    typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;

  return {
    token: data.token,
    driveId,
    email,
    expiresAt,
  };
}

export type FetchAssetByPathOptions = {
  shareId?: string | null;
  collectionId?: string | null;
  signal?: AbortSignal;
};

export async function fetchAssetByPath(
  path: string,
  options: FetchAssetByPathOptions = {}
): Promise<ShadeAssetProps | null> {
  const { apiKey, driveId } = await getShadeConfig();
  const url = new URL(`${SHADE_API_BASE_URL}/assets/path`);
  url.searchParams.set('path', path);
  url.searchParams.set('drive_id', driveId);
  const shareId = options.shareId ?? undefined;
  if (shareId) {
    url.searchParams.set('share_id', shareId);
  }

  const headers: Record<string, string> = {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  };
  const collectionId = options.collectionId ?? undefined;
  if (collectionId) {
    headers['collection-id'] = collectionId;
  }

  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: options.signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message = await safeReadErrorMessage(response);
    throw new Error(
      `Failed to fetch Shade asset by path (${response.status}): ${message}`
    );
  }

  const data = (await response.json()) as ShadeAssetProps;
  if (!isShadeAssetDto(data)) {
    throw new Error('Shade asset response did not match expected structure');
  }
  return data;
}

export async function fetchAssetDownloadUrl(options: {
  assetId: string;
  originType?: 'SOURCE' | 'PROXY';
  download?: boolean;
  fileName?: string;
}) {
  const { apiKey, driveId } = await getShadeConfig();
  const {
    assetId,
    originType = 'SOURCE',
    download = false,
    fileName,
  } = options;

  const url = new URL(`${SHADE_API_BASE_URL}/assets/${assetId}/download`);
  url.searchParams.set('drive_id', driveId);
  url.searchParams.set('origin_type', originType);
  url.searchParams.set('download', download ? 'true' : 'false');
  if (fileName) {
    url.searchParams.set('name', fileName);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    redirect: 'manual',
    cache: 'no-store',
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) {
      throw new Error(
        'Shade download response was a redirect without location'
      );
    }
    return location;
  }

  if (!response.ok) {
    const message = await safeReadErrorMessage(response);
    throw new Error(
      `Failed to fetch Shade asset download URL (${response.status}): ${message}`
    );
  }

  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') {
      return parsed;
    }
    return text;
  } catch {
    return text;
  }
}

export async function fetchPublicFileUrlByAssetId(options: {
  assetId?: string | null;
  originType?: 'SOURCE' | 'PROXY';
  fileName?: string;
}): Promise<string | null> {
  if (!options.assetId || !options.assetId.trim() || options.assetId === null) {
    return null;
  }

  const { assetId, originType = 'SOURCE', fileName } = options;
  if (!assetId) {
    throw new Error('A Shade asset id is required to generate a public URL');
  }

  const url = await fetchAssetDownloadUrl({
    assetId,
    originType,
    download: false,
    fileName,
  });

  if (!url || typeof url !== 'string') {
    throw new Error('Shade download endpoint did not return a URL string');
  }

  return url;
}

export async function getShadeFsBaseUrl() {
  return SHADE_FS_BASE_URL;
}

export async function fetchTranscript(
  assetId: string
): Promise<ShadeTranscriptEntry[] | null> {
  const normalizedAssetId = assetId?.trim();
  if (!normalizedAssetId) {
    return null;
  }

  const { apiKey, driveId } = await getShadeConfig();
  const url = new URL(
    `${SHADE_API_BASE_URL}/assets/${normalizedAssetId}/transcription/utterances`
  );
  url.searchParams.set('drive_id', driveId);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: '*/*',
      Authorization: apiKey,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message = await safeReadErrorMessage(response);
    throw new Error(
      `Failed to fetch transcript (${response.status}): ${message}`
    );
  }

  const data = (await response.json()) as ShadeTranscriptEntry[] | null;

  if (!Array.isArray(data)) {
    return null;
  }

  return data.map((entry, index) => ({
    ...entry,
    id: entry.id ?? `utterance-${index}`,
  }));
}

function decodeJwtPayload(token: string): JwtPayload {
  const segments = token.split('.');
  if (segments.length < 2) {
    return {};
  }
  try {
    const payloadSegment = segments[1];
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return {};
  }
}

async function safeReadErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data === 'object') {
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
      return JSON.stringify(data);
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

function isShadeAssetDto(payload: unknown): payload is ShadeAssetDto {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const obj = payload as Record<string, unknown>;

  const hasId = typeof obj.id === 'string' && obj.id.length > 0;
  const hasPath = typeof obj.path === 'string' && obj.path.length > 0;
  const hasDriveId =
    typeof obj.drive_id === 'string' && obj.drive_id.length > 0;

  if (!hasId || !hasPath || !hasDriveId) {
    return false;
  }

  if (
    obj.size_bytes !== undefined &&
    obj.size_bytes !== null &&
    typeof obj.size_bytes !== 'number'
  ) {
    return false;
  }

  const isValidMetadata = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'object') return false;
    return true;
  };

  if (!isValidMetadata(obj.system_metadata)) {
    return false;
  }

  if (!isValidMetadata(obj.custom_metadata)) {
    return false;
  }

  return true;
}
