'use server';

import { generateText } from 'ai';

import {
  DEFAULT_OPENAI_MODEL,
  getOpenAIClient,
} from '@/lib/ai/client';

export type GenerateTextResponse = {
  prompt: string;
  text: string;
  finishReason: string | null;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    [key: string]: number | undefined;
  };
};

export async function generateTextAction(prompt: string): Promise<GenerateTextResponse> {
  const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

  if (!normalizedPrompt) {
    throw new Error('Prompt is required');
  }

  const openai = getOpenAIClient();

  const { text, finishReason, usage } = await generateText({
    model: openai(DEFAULT_OPENAI_MODEL),
    prompt: normalizedPrompt,
  });

  return {
    prompt: normalizedPrompt,
    text,
    finishReason: finishReason ?? null,
    usage: usage ?? {},
  };
}

