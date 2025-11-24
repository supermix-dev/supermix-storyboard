'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card } from '../ui/card';
import { Text } from '../ui/text';

type FigmaPluginSectionProps = {
  onDownload: () => void;
  isDownloading: boolean;
};

export function FigmaPluginSection({
  onDownload,
  isDownloading,
}: FigmaPluginSectionProps) {
  return (
    <Card className="space-y-2 p-4">
      <Text size="sm">Figma plugin</Text>
      <p className="text-xs text-muted-foreground">
        Download the ready-to-install Supermix Storyboards Importer bundle
        (manifest.json + code.js) and load it via Plugins → Development → Import
        plugin from manifest.
      </p>
      <Button
        variant="outline"
        className="w-full"
        onClick={onDownload}
        disabled={isDownloading}
      >
        <Download className="w-3 h-3" />
        {isDownloading ? 'Preparing bundle…' : 'Download Figma Plugin'}
      </Button>
    </Card>
  );
}
