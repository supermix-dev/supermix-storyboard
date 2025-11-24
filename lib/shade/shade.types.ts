export type ShadeJobState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export type ShadeMetadataPrimitive = string | number | boolean | null;
export type ShadeSystemMetadata = Record<string, ShadeMetadataPrimitive>;

export type ShadeCustomMetadataValue = string | string[] | number | null;
export type ShadeCustomMetadata = Record<string, ShadeCustomMetadataValue>;

export interface ShadeAssetPreviewImage {
  id: string;
  frame: number;
  signed_url: string;
}

export interface ShadeAssetProxyRef {
  id: string;
}

export type ShadeConfig = {
  apiKey: string;
  driveId: string;
};

export type ShadeTokenResponse = {
  token: string;
};

export type ShadeSession = {
  token: string;
  driveId: string;
  email: string;
  expiresAt?: number;
};

export type ShadeMetadata = {
  mime_type?: string | null;
  mime?: string | null;
  [key: string]: unknown;
} | null;

export type ShadeAssetDto = {
  id: string;
  drive_id: string;
  path: string;
  name?: string | null;
  size_bytes?: number | null;
  system_metadata?: ShadeMetadata;
  custom_metadata?: ShadeMetadata;
  [key: string]: unknown;
};

export type JwtPayload = {
  sub?: string;
  aud?: string | string[];
  exp?: number;
};

export interface ShadeAssetProps {
  id: string;
  drive_id: string;
  path: string;
  name: string;
  extension: string;
  updated: string;
  created: string;
  type: 'VIDEO' | string;
  size_bytes: number;
  stack_id: string | null;
  stack_number: number | null;
  is_fs_draft_blob: boolean;
  is_fs_null_blob: boolean;
  rating: number | null;
  ai_indexed: boolean;
  system_metadata: ShadeSystemMetadata;
  custom_metadata: ShadeCustomMetadata;
  preview_images: ShadeAssetPreviewImage[];
  custom_thumbnail: string | null;
  proxy: ShadeAssetProxyRef | null;
  audio_proxy: ShadeAssetProxyRef | null;
  category: string;
  palette: [number, number, number][];
  ocr: string | null;
  transcription_id: string | null;
  faces_present: boolean;
  preview_job_state: ShadeJobState;
  metadata_job_state: ShadeJobState;
  core_vision_job_state: ShadeJobState;
  color_palette_job_state: ShadeJobState;
  core_audio_job_state: ShadeJobState;
  audio_job_state: ShadeJobState;
  text_job_state: ShadeJobState;
  facial_recognition_job_state: ShadeJobState;
  proxy_job_state: ShadeJobState;
  audio_proxy_job_state: ShadeJobState;
  transcription_job_state: ShadeJobState;
  objects: unknown[] | null;
  texture_data: unknown | null;
  integration_data: Record<string, unknown> | null;
}

export interface ShadeTranscriptWord {
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface ShadeTranscriptEntry {
  id?: string;
  speaker?: string | null;
  start?: number;
  end?: number;
  text: string;
  words?: ShadeTranscriptWord[];
}
