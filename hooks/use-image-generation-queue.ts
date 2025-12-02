'use client';

import type { ImageModel } from '@/app/api/generate-image/route';
import { useCallback, useEffect, useRef, useState } from 'react';

export type GenerationStatus = 'queued' | 'generating' | 'complete' | 'error';

export type GenerationJob = {
  id: string;
  storyboardId: string;
  status: GenerationStatus;
  model: ImageModel;
  prompt: string;
  imageUrl?: string;
  error?: string;
  addedAt: number;
};

export type QueueStats = {
  queued: number;
  generating: number;
  total: number;
};

const MAX_CONCURRENT = 3;

export function useImageGenerationQueue(
  updateStoryboardImageUrl: (
    storyboardId: string,
    imageUrl: string | null
  ) => void,
  onGenerationComplete?: () => void
) {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const processingRef = useRef(false);

  // Get job status for a specific storyboard
  const getJobStatus = useCallback(
    (storyboardId: string): GenerationJob | null => {
      return jobs.find((job) => job.storyboardId === storyboardId) ?? null;
    },
    [jobs]
  );

  // Get queue statistics
  const getQueueStats = useCallback((): QueueStats => {
    const queued = jobs.filter((job) => job.status === 'queued').length;
    const generating = jobs.filter((job) => job.status === 'generating').length;
    return {
      queued,
      generating,
      total: queued + generating,
    };
  }, [jobs]);

  // Add a new job to the queue
  const addToQueue = useCallback(
    (storyboardId: string, prompt: string, model: ImageModel) => {
      // Check if a job already exists for this storyboard
      const existingJob = jobs.find((job) => job.storyboardId === storyboardId);
      if (
        existingJob &&
        (existingJob.status === 'queued' || existingJob.status === 'generating')
      ) {
        console.warn(`Job already exists for storyboard ${storyboardId}`);
        return existingJob.id;
      }

      const newJob: GenerationJob = {
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        storyboardId,
        status: 'queued',
        model,
        prompt,
        addedAt: Date.now(),
      };

      setJobs((prev) => [...prev, newJob]);
      return newJob.id;
    },
    [jobs]
  );

  // Remove completed or errored jobs after a delay
  const cleanupJob = useCallback((jobId: string) => {
    setTimeout(() => {
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    }, 3000); // Keep for 3 seconds for UI feedback
  }, []);

  // Cancel a generation (remove from queue if queued)
  const cancelGeneration = useCallback((storyboardId: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.storyboardId === storyboardId);
      if (job && job.status === 'queued') {
        return prev.filter((j) => j.storyboardId !== storyboardId);
      }
      return prev;
    });
  }, []);

  // Retry a failed job
  const retryJob = useCallback((storyboardId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.storyboardId === storyboardId && job.status === 'error'
          ? { ...job, status: 'queued', error: undefined }
          : job
      )
    );
  }, []);

  // Process a single job
  const processJob = useCallback(
    async (job: GenerationJob) => {
      // Mark as generating
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'generating' as const } : j
        )
      );

      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: job.prompt,
            model: job.model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.imageUrl) {
          throw new Error('No image URL in response');
        }

        // Update job as complete
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'complete' as const,
                  imageUrl: data.imageUrl,
                }
              : j
          )
        );

        // Update the storyboard with the new image URL
        updateStoryboardImageUrl(job.storyboardId, data.imageUrl);

        // Notify that generation is complete (for balance refresh)
        onGenerationComplete?.();

        // Cleanup after a delay
        cleanupJob(job.id);
      } catch (error) {
        console.error(`Failed to generate image for job ${job.id}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Mark job as error
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'error' as const,
                  error: errorMessage,
                }
              : j
          )
        );

        // Cleanup error jobs after a longer delay
        setTimeout(() => cleanupJob(job.id), 10000);
      }
    },
    [updateStoryboardImageUrl, cleanupJob]
  );

  // Process the queue (called automatically when jobs change)
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const currentGenerating = jobs.filter(
        (job) => job.status === 'generating'
      ).length;
      const availableSlots = MAX_CONCURRENT - currentGenerating;

      if (availableSlots > 0) {
        const queuedJobs = jobs
          .filter((job) => job.status === 'queued')
          .sort((a, b) => a.addedAt - b.addedAt)
          .slice(0, availableSlots);

        // Start processing available jobs (don't await, let them run concurrently)
        queuedJobs.forEach((job) => {
          processJob(job);
        });
      }
    } finally {
      processingRef.current = false;
    }
  }, [jobs, processJob]);

  // Auto-process queue when jobs change
  useEffect(() => {
    const hasQueuedJobs = jobs.some((job) => job.status === 'queued');
    const currentGenerating = jobs.filter(
      (job) => job.status === 'generating'
    ).length;

    if (hasQueuedJobs && currentGenerating < MAX_CONCURRENT) {
      processQueue();
    }
  }, [jobs, processQueue]);

  return {
    jobs,
    addToQueue,
    getJobStatus,
    getQueueStats,
    cancelGeneration,
    retryJob,
  };
}
