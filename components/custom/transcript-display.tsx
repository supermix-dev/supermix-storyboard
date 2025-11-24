'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

type TranscriptDisplayProps = {
  transcriptContent: string;
};

export function TranscriptDisplay({
  transcriptContent,
}: TranscriptDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!transcriptContent) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Transcript:</h2>
        <Button onClick={() => setIsOpen(!isOpen)} variant="outline" size="sm">
          {isOpen ? 'Hide' : 'Show'}
        </Button>
      </div>
      {isOpen && (
        <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-auto">
          {transcriptContent}
        </pre>
      )}
    </div>
  );
}
