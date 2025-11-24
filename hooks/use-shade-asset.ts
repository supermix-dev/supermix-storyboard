'use client';
import { useCallback, useState } from 'react';

import {
  fetchAssetByPath,
  fetchPublicFileUrlByAssetId,
  fetchTranscript,
} from '@/lib/shade/server';
import type {
  ShadeAssetProps,
  ShadeTranscriptEntry,
} from '@/lib/shade/shade.types';

type TranscriptData = ShadeTranscriptEntry[] | null;

export type UseShadeAssetOptions = {
  initialPath?: string;
};

// const initialPath =
// '/3374366f-293a-4ab4-871e-ccd64eeba320/Hiten Shah/Hiten_Kalshi_2025-10-22/01_Assets/Footage/Kalshi Narrative Edit - Audio Engineered.mp4';

export function useShadeAsset() {
  const [asset, setAsset] = useState<ShadeAssetProps | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState('');

  const fetchAsset = useCallback(async (path: string) => {
    if (!path.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setAsset(null);
    setFileUrl(null);
    setTranscript(null);

    try {
      const fetchedAsset = await fetchAssetByPath(path);
      if (!fetchedAsset) {
        setError('Asset not found');
        return;
      }

      setAsset(fetchedAsset);

      const url = await fetchPublicFileUrlByAssetId({
        assetId: fetchedAsset.id,
      });
      setFileUrl(url);

      const transcriptReady =
        fetchedAsset.transcription_id &&
        fetchedAsset.transcription_job_state === 'COMPLETED';

      if (transcriptReady) {
        try {
          const transcriptData = await fetchTranscript(fetchedAsset.id);

          setTranscript(transcriptData);
        } catch (transcriptError) {
          console.error('Error fetching transcript:', transcriptError);
          setTranscript(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAssetMetadata = useCallback(async (path: string) => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetchedAsset = await fetchAssetByPath(path);
      if (!fetchedAsset) {
        setError('Asset not found');
        return;
      }
      setAsset(fetchedAsset);
      const url = await fetchPublicFileUrlByAssetId({
        assetId: fetchedAsset.id,
      });
      setFileUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    asset,
    fileUrl,
    transcript,
    loading,
    error,
    fetchAsset,
    reloadAssetMetadata,
    pathInput,
    setPathInput,
    setAsset,
    setTranscript,
    setFileUrl,
  };
}
