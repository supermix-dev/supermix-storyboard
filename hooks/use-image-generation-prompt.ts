import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import type { ImageModel } from '@/app/api/generate-image/route';
import type { TranscriptSegment } from '@/hooks/use-storyboards';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ImageStyle = 'noir' | 'sketch';
type GenerationMode = 'concept' | 'highres';

const STYLE_INSTRUCTIONS: Record<ImageStyle, string> = {
  noir: 'Global style instructions: cinematic noir atmosphere, mostly at night in moody urban or interior environments — 2D stylized / minimalist illustration with clean geometric shapes and strong silhouettes — deep blacks, muted blues, subtle red accents for highlights and rim light — soft, filmic lighting with atmospheric haze, reflections on wet surfaces or glass, and a sense of depth — compositions inspired by animated noir cityscapes and hacker dramas (Batman: The Animated Series city vibes meets Mr. Robot tone) — quiet, tense mood with "calm before something happens" energy — simple, uncluttered framing, clear focal point, and balanced negative space — no text, signage, or logos.',
  sketch:
    'Global style instructions: Loose hand-drawn storyboard sketch — clean black pencil lines on white paper, minimal shading, rough outlines, cinematic composition, high-contrast shapes, no color, simple forms, emphasis on gesture and framing, looks like a quick concept artist thumbnail, unfinished edges, dynamic perspective, storyboard artist style, animation pre-vis energy.',
};

type UseImageGenerationPromptParams = {
  storyboard: StoryboardSceneProps;
  matchedTranscript: TranscriptSegment[];
  allStoryboards: StoryboardSceneProps[];
  getMatchedTranscript: (
    storyboard: StoryboardSceneProps
  ) => TranscriptSegment[];
  isOpen: boolean;
  onGenerate: (storyboardId: string, prompt: string, model: ImageModel) => void;
  onClose: () => void;
};

// Determine mode based on model selection
const getModeFromModel = (model: ImageModel): GenerationMode => {
  return model === 'fal-ai/flux/dev' ? 'concept' : 'highres';
};

// Get default style for a given mode
const getDefaultStyleForMode = (mode: GenerationMode): ImageStyle => {
  return mode === 'concept' ? 'sketch' : 'noir';
};

export function useImageGenerationPrompt({
  storyboard,
  matchedTranscript,
  allStoryboards,
  getMatchedTranscript,
  isOpen,
  onGenerate,
  onClose,
}: UseImageGenerationPromptParams) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ImageModel>('fal-ai/nano-banana-pro');
  const [manualStyleOverride, setManualStyleOverride] =
    useState<ImageStyle | null>(null);
  const [includeContext, setIncludeContext] = useState(true);

  // Derive mode from model
  const mode = useMemo(() => getModeFromModel(model), [model]);

  // Derive style from mode, but allow manual override
  const style = useMemo(() => {
    if (manualStyleOverride) {
      return manualStyleOverride;
    }
    return getDefaultStyleForMode(mode);
  }, [mode, manualStyleOverride]);

  // Wrapper for setStyle that tracks manual overrides
  const handleStyleChange = (newStyle: ImageStyle) => {
    const expectedStyle = getDefaultStyleForMode(mode);
    if (newStyle === expectedStyle) {
      // User set it back to default, clear override
      setManualStyleOverride(null);
    } else {
      // User manually set a different style
      setManualStyleOverride(newStyle);
    }
  };

  // Wrapper for setModel that clears style override when model changes
  const handleModelChange = (newModel: ImageModel) => {
    setModel(newModel);
    // Clear manual style override when model changes so style follows mode
    setManualStyleOverride(null);
  };

  // Helper function to get surrounding scenes context
  const getSurroundingContext = useCallback(() => {
    const currentIndex = allStoryboards.findIndex(
      (sb) => sb.id === storyboard.id
    );
    if (currentIndex === -1) return { previous: null, next: null };

    const previousScene =
      currentIndex > 0 ? allStoryboards[currentIndex - 1] : null;
    const nextScene =
      currentIndex < allStoryboards.length - 1
        ? allStoryboards[currentIndex + 1]
        : null;

    const getPreviousContext = () => {
      if (!previousScene) return null;
      const transcript = getMatchedTranscript(previousScene);
      const transcriptText = transcript
        .map((seg: TranscriptSegment) => seg.text)
        .join(' ')
        .trim();
      const notes = previousScene.notes?.trim() || '';
      if (!transcriptText && !notes) return null;
      return { transcript: transcriptText, notes };
    };

    const getNextContext = () => {
      if (!nextScene) return null;
      const transcript = getMatchedTranscript(nextScene);
      const transcriptText = transcript
        .map((seg: TranscriptSegment) => seg.text)
        .join(' ')
        .trim();
      const notes = nextScene.notes?.trim() || '';
      if (!transcriptText && !notes) return null;
      return { transcript: transcriptText, notes };
    };

    return {
      previous: getPreviousContext(),
      next: getNextContext(),
    };
  }, [allStoryboards, storyboard.id, getMatchedTranscript]);

  // Generate default prompt from transcript and notes
  const generatedPrompt = useMemo(() => {
    if (!isOpen) return '';

    // Check if there's a stored prompt for this scene
    if (storyboard.prompt?.trim()) {
      return storyboard.prompt.trim();
    }

    // Otherwise, auto-generate the prompt
    const transcriptText = matchedTranscript
      .map((segment) => segment.text)
      .join(' ');

    const notesText = storyboard.notes?.trim() || '';
    const styleInstructions = STYLE_INSTRUCTIONS[style];

    let defaultPrompt = '';

    // Add context from surrounding scenes if enabled
    if (includeContext) {
      const context = getSurroundingContext();

      if (context.previous) {
        defaultPrompt += '=== Context from Previous Scene ===\n';
        if (context.previous.transcript) {
          defaultPrompt += `Previous Transcript: ${context.previous.transcript}\n`;
        }
        if (context.previous.notes) {
          defaultPrompt += `Previous Notes: ${context.previous.notes}\n`;
        }
        defaultPrompt += '\n';
      }
    }

    // Add current scene content
    defaultPrompt += '=== Current Scene (Primary Focus) ===\n';
    if (transcriptText) {
      defaultPrompt += `Transcript: ${transcriptText}`;
    }

    if (notesText) {
      if (transcriptText) {
        defaultPrompt += '\n\n';
      }
      defaultPrompt += `Notes: ${notesText}`;
    }

    // Add context from next scene if enabled
    if (includeContext) {
      const context = getSurroundingContext();

      if (context.next) {
        defaultPrompt += '\n\n=== Context from Next Scene ===\n';
        if (context.next.transcript) {
          defaultPrompt += `Next Transcript: ${context.next.transcript}\n`;
        }
        if (context.next.notes) {
          defaultPrompt += `Next Notes: ${context.next.notes}\n`;
        }
      }
    }

    // Add style instructions
    if (defaultPrompt) {
      defaultPrompt += '\n\n';
    }
    defaultPrompt += styleInstructions;

    if (!defaultPrompt) {
      defaultPrompt = storyboard.title || 'Generate an image for this scene';
    }

    return defaultPrompt;
  }, [
    isOpen,
    matchedTranscript,
    storyboard.notes,
    storyboard.title,
    storyboard.prompt,
    style,
    includeContext,
    getSurroundingContext,
  ]);

  // Track previous isOpen state to avoid cascading renders
  const prevIsOpenRef = useRef(isOpen);

  // Update prompt when generated prompt changes or dialog opens
  useEffect(() => {
    const wasClosed = !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && generatedPrompt && wasClosed) {
      // Only update when transitioning from closed to open
      startTransition(() => {
        setPrompt(generatedPrompt);
      });
    } else if (isOpen && generatedPrompt && prompt !== generatedPrompt) {
      // Also update if prompt changed while dialog is open
      startTransition(() => {
        setPrompt(generatedPrompt);
      });
    }
  }, [isOpen, generatedPrompt, prompt]);

  const handleGenerate = () => {
    if (!prompt.trim()) {
      return;
    }

    const finalPrompt = `${prompt.trim()}\n\n${STYLE_INSTRUCTIONS[style]}`;

    onGenerate(storyboard.id, finalPrompt, model);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return {
    prompt,
    setPrompt,
    model,
    setModel: handleModelChange,
    style,
    setStyle: handleStyleChange,
    mode,
    includeContext,
    setIncludeContext,
    handleGenerate,
    handleKeyDown,
  };
}
