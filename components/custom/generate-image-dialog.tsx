'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import type { ImageModel } from '@/app/api/generate-image/route';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Combobox, type ComoboOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useImageGenerationPrompt } from '@/hooks/use-image-generation-prompt';
import type { TranscriptSegment } from '@/hooks/use-storyboards';
import { Clock, Palette, Sparkles, Zap } from 'lucide-react';
import { InputWrapper } from '../ui/input-wrapper';

type GenerateImageDialogProps = {
  storyboard: StoryboardSceneProps;
  matchedTranscript: TranscriptSegment[];
  allStoryboards: StoryboardSceneProps[];
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (storyboardId: string, prompt: string, model: ImageModel) => void;
  isQueued?: boolean;
  queuePosition?: number;
};

type ImageStyle = 'noir' | 'sketch';

const STYLE_OPTIONS: ComoboOption[] = [
  {
    value: 'noir',
    label: 'Noir',
    icon: <Palette className="h-4 w-4" />,
  },
  {
    value: 'sketch',
    label: 'Sketch',
    icon: <Palette className="h-4 w-4" />,
  },
];

const MODEL_OPTIONS: ComoboOption[] = [
  {
    value: 'fal-ai/nano-banana-pro',
    label: 'Nano Banana Pro',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'fal-ai/flux/schnell',
    label: 'FLUX Schnell',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'fal-ai/flux/dev',
    label: 'FLUX Dev',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'fal-ai/fast-sdxl',
    label: 'Fast SDXL',
    icon: <Sparkles className="h-4 w-4" />,
  },
];

export function GenerateImageDialog({
  storyboard,
  matchedTranscript,
  allStoryboards,
  getMatchedTranscript,
  isOpen,
  onClose,
  onGenerate,
  isQueued = false,
  queuePosition,
}: GenerateImageDialogProps) {
  const {
    prompt,
    setPrompt,
    model,
    setModel,
    style,
    setStyle,
    mode,
    includeContext,
    setIncludeContext,
    handleGenerate,
    handleKeyDown,
  } = useImageGenerationPrompt({
    storyboard,
    matchedTranscript,
    allStoryboards,
    getMatchedTranscript,
    isOpen,
    onGenerate,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Scene with AI
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Mode Toggle */}
          <div className="space-y-2">
            <Label>Mode</Label>
            <ButtonGroup className="w-full">
              <Button
                type="button"
                variant={mode === 'concept' ? 'default' : 'outline'}
                className="flex-1 flex flex-col items-start gap-1 h-auto py-3"
                onClick={() => setModel('fal-ai/flux/dev')}
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">Concept</span>
                </div>
                <span className="text-xs font-normal opacity-80">
                  Quick and fast concepts
                </span>
              </Button>
              <Button
                type="button"
                variant={mode === 'highres' ? 'default' : 'outline'}
                className="flex-1 flex flex-col items-start gap-1 h-auto py-3"
                onClick={() => setModel('fal-ai/nano-banana-pro')}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">High Res</span>
                </div>
                <span className="text-xs font-normal opacity-80">
                  Expensive and slow
                </span>
              </Button>
            </ButtonGroup>
          </div>

          {/* Context Toggle */}
          <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/30 p-3">
            <Input
              type="checkbox"
              id="includeContext"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <Label
              htmlFor="includeContext"
              className="text-sm cursor-pointer flex-1"
            >
              Include context from surrounding scenes (recommended)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Combobox
                options={MODEL_OPTIONS}
                value={model}
                setValue={(value) => setModel(value as ImageModel)}
                placeholder="Select a model..."
                searchable={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Combobox
                options={STYLE_OPTIONS}
                value={style}
                setValue={(value) => setStyle(value as ImageStyle)}
                placeholder="Select a style..."
                searchable={false}
              />
            </div>
          </div>

          <InputWrapper label="Prompt">
            <span className="text-xs text-muted-foreground">
              Cmd/Ctrl + Enter to generate
            </span>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to generate..."
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Edit the prompt to customize the generated image. The default
              includes the transcript and notes for this scene.
            </p>
          </InputWrapper>

          {isQueued && queuePosition !== undefined && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm text-muted-foreground">
                This scene is already in the generation queue
                {queuePosition > 0 && ` (position ${queuePosition})`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isQueued}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isQueued ? 'Already in Queue' : 'Generate Image'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
