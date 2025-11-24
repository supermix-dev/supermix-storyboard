'use client';

import type { StoryboardCardProps } from '@/components/custom/storyboard-card';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image, { type ImageLoader } from 'next/image';
import { useEffect, useRef, useState } from 'react';

const externalImageLoader: ImageLoader = ({ src }) => src;

export function StoryboardGridCard({
  storyboard,
  matchedTranscript,
  onUpdateImageUrl,
}: StoryboardCardProps) {
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div
        className="w-full aspect-video border-b relative bg-muted/20 group cursor-pointer"
        onPaste={handlePaste}
        onClick={() => !isEditing && setIsEditing(true)}
        title={
          storyboard.image_url
            ? 'Click to change image'
            : 'Click to paste image URL'
        }
      >
        {storyboard.image_url ? (
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
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            {isEditing ? 'Paste image URL here' : 'Click to add image'}
          </div>
        )}
        {isEditing && (
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
      </div>

      <div className="space-y-2 text-sm p-4">
        {matchedTranscript.length > 0 &&
          matchedTranscript.map((entry, idx) => {
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
        {(storyboard.start || storyboard.end) && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {storyboard.start?.toFixed(2)}s → {storyboard.end?.toFixed(2)}s
          </span>
        )}
      </div>
    </Card>
  );
}
