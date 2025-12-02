'use server';

import { generateText } from 'ai';

import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from '@/lib/ai/client';

export type SceneContext = {
  transcript: string;
  notes?: string;
};

export type GeneratePromptParams = {
  currentScene: SceneContext;
  previousScene?: SceneContext | null;
  nextScene?: SceneContext | null;
};

export type GeneratePromptResponse = {
  prompt: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    [key: string]: number | undefined;
  };
};

const SYSTEM_PROMPT = `You are an expert storyboard artist. Create SHORT, PUNCHY compositional descriptions (50-75 words max).

Focus on essential elements only:
- Camera angle and shot type (wide/medium/close-up)
- Subject positioning and what they're doing
- Key environmental elements
- Spatial relationships

DO NOT include: art styles, lighting moods, color palettes, aesthetic terms, or rendering techniques.

Be direct and concise. Example: "Medium shot, eye-level. Two people across a table, mid-conversation. One gestures while speaking, the other listens intently. Office setting with window in background."

Output ONLY the description - nothing else.`;

export async function generatePromptAction(
  params: GeneratePromptParams
): Promise<GeneratePromptResponse> {
  const { currentScene, previousScene, nextScene } = params;

  if (!currentScene?.transcript?.trim() && !currentScene?.notes?.trim()) {
    throw new Error(
      'Current scene must have either transcript or notes content'
    );
  }

  // Build the user message with scene context
  let userMessage = '';

  // Add previous scene context if available
  if (previousScene) {
    userMessage += '=== PREVIOUS SCENE (for context) ===\n';
    if (previousScene.transcript) {
      userMessage += `Transcript: ${previousScene.transcript}\n`;
    }
    if (previousScene.notes) {
      userMessage += `Notes: ${previousScene.notes}\n`;
    }
    userMessage += '\n';
  }

  // Add current scene (the main focus)
  userMessage += '=== CURRENT SCENE (generate prompt for this) ===\n';
  if (currentScene.transcript) {
    userMessage += `Transcript: ${currentScene.transcript}\n`;
  }
  if (currentScene.notes) {
    userMessage += `Notes: ${currentScene.notes}\n`;
  }
  userMessage += '\n';

  // Add next scene context if available
  if (nextScene) {
    userMessage += '=== NEXT SCENE (for context) ===\n';
    if (nextScene.transcript) {
      userMessage += `Transcript: ${nextScene.transcript}\n`;
    }
    if (nextScene.notes) {
      userMessage += `Notes: ${nextScene.notes}\n`;
    }
  }

  const openai = getOpenAIClient();

  try {
    const { text, usage } = await generateText({
      model: openai(DEFAULT_OPENAI_MODEL),
      system: SYSTEM_PROMPT,
      prompt: userMessage,
      temperature: 0.7,
    });

    return {
      prompt: text.trim(),
      usage: usage ?? {},
    };
  } catch (error) {
    console.error('Error generating prompt with AI:', error);
    throw new Error(
      `Failed to generate prompt: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
