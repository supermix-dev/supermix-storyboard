import { createOpenAI } from '@ai-sdk/openai';

/**
 * Default OpenAI model used by the AI SDK helper.
 * Adjust as needed once you have access to larger models.
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

let cachedOpenAI: ReturnType<typeof createOpenAI> | null = null;

function ensureOpenAiInstance() {
  if (cachedOpenAI) {
    return cachedOpenAI;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Add it to your .env file.'
    );
  }

  cachedOpenAI = createOpenAI({
    apiKey,
  });

  return cachedOpenAI;
}

export function getOpenAIClient() {
  return ensureOpenAiInstance();
}
