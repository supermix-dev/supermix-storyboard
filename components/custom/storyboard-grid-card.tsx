'use client';

import type { StoryboardCardProps } from '@/components/custom/storyboard-card';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image, { type ImageLoader } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '../ui/badge';

const externalImageLoader: ImageLoader = ({ src }) => src;

export function StoryboardGridCard({
  storyboard,
  matchedTranscript,
  onUpdateImageUrl,
  onUpdateNotes,
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
        <div className="p-0 flex-1 relative">
          <textarea
            placeholder="Add notes for this scene..."
            value={storyboard.notes || ''}
            onChange={(e) => onUpdateNotes?.(storyboard.id, e.target.value)}
            className="min-h-16 text-sm flex-1 w-full h-full px-4 py-3 outline-none border-none ring-0 resize-none"
          />
        </div>
      </div>
    </Card>
  );
}
