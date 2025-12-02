import * as fal from '@fal-ai/serverless-client';
import { NextRequest, NextResponse } from 'next/server';

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_API_KEY,
});

// Supported models
export type ImageModel =
  | 'fal-ai/flux/schnell'
  | 'fal-ai/flux/dev'
  | 'fal-ai/fast-sdxl'
  | 'fal-ai/nano-banana-pro';

type GenerateImageRequest = {
  prompt: string;
  model: ImageModel;
};

type GenerateImageResponse = {
  imageUrl: string;
};

type FalImageResult = {
  images?: Array<{ url: string }>;
  image?: { url: string };
  data?: {
    images?: Array<{ url: string }>;
    image?: { url: string };
  };
};

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { prompt, model } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!model || typeof model !== 'string') {
      return NextResponse.json(
        { error: 'Model is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate model
    const validModels: ImageModel[] = [
      'fal-ai/flux/schnell',
      'fal-ai/flux/dev',
      'fal-ai/fast-sdxl',
      'fal-ai/nano-banana-pro',
    ];

    if (!validModels.includes(model as ImageModel)) {
      return NextResponse.json(
        { error: `Invalid model. Must be one of: ${validModels.join(', ')}` },
        { status: 400 }
      );
    }

    // Call fal.ai API with 16:9 aspect ratio
    const result = (await fal.subscribe(model, {
      input: {
        prompt,
        // Set 16:9 horizontal aspect ratio for all models
        image_size:
          model === 'fal-ai/fast-sdxl'
            ? 'landscape_16_9'
            : model === 'fal-ai/nano-banana-pro'
            ? { width: 1344, height: 768 }
            : { width: 1344, height: 768 }, // FLUX models use width/height
        num_inference_steps: model === 'fal-ai/flux/schnell' ? 4 : undefined,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Generation in progress for model:', model);
        }
      },
    })) as FalImageResult;

    console.log('fal.ai result:', JSON.stringify(result, null, 2));

    // Extract image URL from result
    let imageUrl: string | null = null;

    // Try different possible response structures
    if (result) {
      // Check if images array exists at top level
      if (
        result.images &&
        Array.isArray(result.images) &&
        result.images.length > 0
      ) {
        imageUrl = result.images[0].url;
      }
      // Check if image exists at top level
      else if (
        result.image &&
        typeof result.image === 'object' &&
        result.image.url
      ) {
        imageUrl = result.image.url;
      }
      // Check if data.images exists
      else if (result.data && typeof result.data === 'object') {
        const data = result.data;

        if (
          data.images &&
          Array.isArray(data.images) &&
          data.images.length > 0
        ) {
          imageUrl = data.images[0].url;
        } else if (
          data.image &&
          typeof data.image === 'object' &&
          data.image.url
        ) {
          imageUrl = data.image.url;
        }
      }
    }

    if (!imageUrl) {
      console.error(
        'No image URL in fal.ai response. Full response:',
        JSON.stringify(result, null, 2)
      );
      return NextResponse.json(
        { error: 'Failed to generate image: No image URL returned' },
        { status: 500 }
      );
    }

    const response: GenerateImageResponse = {
      imageUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error generating image with fal.ai:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific error types
    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized')
    ) {
      return NextResponse.json(
        { error: 'API authentication failed. Please check configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Failed to generate image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
