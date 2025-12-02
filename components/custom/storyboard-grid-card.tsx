'use client';

import type { ImageModel } from '@/app/api/generate-image/route';
import {
  generatePromptAction,
  type SceneContext,
} from '@/app/actions/generate-prompt';
import { GenerateImageDialog } from '@/components/custom/generate-image-dialog';
import type { StoryboardCardProps } from '@/components/custom/storyboard-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { GenerationJob } from '@/hooks/use-image-generation-queue';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Image, { type ImageLoader } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '../ui/badge';

const externalImageLoader: ImageLoader = ({ src }) => src;

type StoryboardGridCardPropsWithQueue = StoryboardCardProps & {
  generationJob?: GenerationJob | null;
  onGenerateImage?: (
    storyboardId: string,
    prompt: string,
    model: ImageModel
  ) => void;
  onRetryGeneration?: (storyboardId: string) => void;
};

export function StoryboardGridCard({
  storyboard,
  matchedTranscript,
  allStoryboards,
  getMatchedTranscript,
  onUpdateImageUrl,
  onUpdateNotes,
  onUpdatePrompt,
  generationJob,
  onGenerateImage,
  onRetryGeneration,
}: StoryboardGridCardPropsWithQueue) {
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleImageUrlSubmit = (url?: string) => {
    const urlToUse = url || imageUrlInput.trim();
    if (urlToUse) {
      onUpdateImageUrl?.(storyboard.id, urlToUse);
      setImageUrlInput('');
      setIsEditing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (
      pastedText &&
      (pastedText.startsWith('http://') || pastedText.startsWith('https://'))
    ) {
      e.preventDefault();
      handleImageUrlSubmit(pastedText);
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (
      pastedText &&
      (pastedText.startsWith('http://') || pastedText.startsWith('https://'))
    ) {
      e.preventDefault();
      handleImageUrlSubmit(pastedText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleImageUrlSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setImageUrlInput('');
    }
  };

  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleGenerate = (
    storyboardId: string,
    prompt: string,
    model: ImageModel
  ) => {
    onGenerateImage?.(storyboardId, prompt, model);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRetryGeneration?.(storyboard.id);
  };

  // Generate AI prompt for the scene
  const handleGeneratePrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingPrompt(true);
    setPromptError(null);

    try {
      // Gather context from current scene
      const transcriptText = matchedTranscript
        .map((segment) => {
          const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
          return `${speakerPrefix}${segment.text}`;
        })
        .join('\n');

      const currentScene: SceneContext = {
        transcript: transcriptText,
        notes: storyboard.notes,
      };

      // Find current scene index
      const currentIndex = allStoryboards.findIndex(
        (sb) => sb.id === storyboard.id
      );

      // Get previous scene context
      let previousScene: SceneContext | null = null;
      if (currentIndex > 0) {
        const prevStoryboard = allStoryboards[currentIndex - 1];
        const prevTranscript = getMatchedTranscript(prevStoryboard);
        const prevTranscriptText = prevTranscript
          .map((seg) => {
            const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
            return `${speakerPrefix}${seg.text}`;
          })
          .join('\n');
        
        if (prevTranscriptText || prevStoryboard.notes) {
          previousScene = {
            transcript: prevTranscriptText,
            notes: prevStoryboard.notes,
          };
        }
      }

      // Get next scene context
      let nextScene: SceneContext | null = null;
      if (currentIndex < allStoryboards.length - 1) {
        const nextStoryboard = allStoryboards[currentIndex + 1];
        const nextTranscript = getMatchedTranscript(nextStoryboard);
        const nextTranscriptText = nextTranscript
          .map((seg) => {
            const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
            return `${speakerPrefix}${seg.text}`;
          })
          .join('\n');
        
        if (nextTranscriptText || nextStoryboard.notes) {
          nextScene = {
            transcript: nextTranscriptText,
            notes: nextStoryboard.notes,
          };
        }
      }

      // Call the server action
      const response = await generatePromptAction({
        currentScene,
        previousScene,
        nextScene,
      });

      // Update the prompt field with the generated text
      onUpdatePrompt?.(storyboard.id, response.prompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
      setPromptError(
        error instanceof Error ? error.message : 'Failed to generate prompt'
      );
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Determine the queue position if queued
  const queuePosition = generationJob?.status === 'queued' ? 1 : undefined;

  // Check generation states
  const isGenerating = generationJob?.status === 'generating';
  const isQueued = generationJob?.status === 'queued';
  const hasError = generationJob?.status === 'error';
  const isInProcess = isGenerating || isQueued;

  return (
    <>
      <Card className="flex h-full flex-col overflow-hidden">
        <div
          className="w-full aspect-video border-b relative bg-muted/20 group cursor-pointer"
          onPaste={handlePaste}
          onClick={() => !isEditing && !isInProcess && setIsEditing(true)}
          title={
            storyboard.image_url
              ? 'Click to change image'
              : 'Click to paste image URL or generate with AI'
          }
        >
          {storyboard.image_url ? (
            <>
              <Image
                src={storyboard.image_url}
                alt={storyboard.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
                loader={externalImageLoader}
                unoptimized
                onError={() => {
                  onUpdateImageUrl?.(storyboard.id, null);
                }}
              />
              {/* Generate button on hover when image exists */}
              {onGenerateImage && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    onClick={handleGenerateClick}
                  >
                    <Sparkles className="h-3 w-3" />
                    Regenerate
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
              {isGenerating && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">Generating...</span>
                </div>
              )}
              {isQueued && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-xs font-medium">
                    Queued {queuePosition ? `(#${queuePosition})` : ''}
                  </span>
                </div>
              )}
              {hasError && (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <span className="text-xs font-medium text-destructive">
                    Generation failed
                  </span>
                  {onRetryGeneration && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      className="gap-1"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              )}
              {!isInProcess && !hasError && (
                <>
                  {isEditing ? (
                    'Paste image URL here'
                  ) : (
                    <>
                      <span>Click to add image</span>
                      {onGenerateImage && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={handleGenerateClick}
                        >
                          <Sparkles className="h-3 w-3" />
                          Generate with AI
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {isEditing && !isInProcess && (
            <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-4 z-10">
              <Input
                ref={inputRef}
                type="url"
                placeholder="Paste or type image URL..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onPaste={handleInputPaste}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!imageUrlInput.trim()) {
                    setIsEditing(false);
                  }
                }}
                className="max-w-md"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Loading overlay when generating */}
          {isInProcess && storyboard.image_url && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-medium">
                  {isGenerating ? 'Generating...' : 'Queued'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm flex-1 flex flex-col">
          <div className="px-4 py-2">
            {(storyboard.start || storyboard.end) && (
              <Badge variant="outline">
                {storyboard.start?.toFixed(2)}s → {storyboard.end?.toFixed(2)}s
              </Badge>
            )}
          </div>

          <div className="flex flex-col border-t border-b px-4 py-2">
            {matchedTranscript.length > 0 && (
              <div className="space-y-2">
                {matchedTranscript.map((entry, idx) => {
                  return (
                    <div key={entry.id ?? idx}>
                      {entry.speaker && (
                        <span className="mr-2 font-semibold text-primary">
                          {entry.speaker}:
                        </span>
                      )}
                      {entry.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-0 flex-1 relative border-b bg-amber-50/30 dark:bg-amber-950/10">
            <textarea
              placeholder="AI prompt for image generation..."
              value={storyboard.prompt || ''}
              onChange={(e) => onUpdatePrompt?.(storyboard.id, e.target.value)}
              className="min-h-16 text-sm flex-1 w-full h-full px-4 py-3 pr-12 outline-none border-none ring-0 resize-none bg-transparent placeholder:text-amber-700/50 dark:placeholder:text-amber-300/30"
            />
            {/* AI Generate Prompt Button */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute bottom-2 right-2 h-7 w-7 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/20"
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt}
              title="Generate prompt with AI"
            >
              {isGeneratingPrompt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </Button>
            {/* Error message */}
            {promptError && (
              <div className="absolute bottom-full left-0 right-0 mb-1 px-2">
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded px-2 py-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{promptError}</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-0 flex-1 relative">
            <textarea
              placeholder="Add notes for this scene..."
              value={storyboard.notes || ''}
              onChange={(e) => onUpdateNotes?.(storyboard.id, e.target.value)}
              className="min-h-16 text-sm flex-1 w-full h-full px-4 py-3 outline-none border-none ring-0 resize-none"
            />
          </div>
        </div>

        {/* Generate Image Dialog */}
        {onGenerateImage && (
          <GenerateImageDialog
            storyboard={storyboard}
            matchedTranscript={matchedTranscript}
            allStoryboards={allStoryboards}
            getMatchedTranscript={getMatchedTranscript}
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onGenerate={handleGenerate}
            isQueued={isQueued}
            queuePosition={queuePosition}
          />
        )}
      </Card>
    </>
  );
}
