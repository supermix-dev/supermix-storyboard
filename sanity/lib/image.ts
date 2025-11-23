import createImageUrlBuilder from '@sanity/image-url';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

import { sanityEnv } from '../env';

const builder =
  sanityEnv.projectId && sanityEnv.dataset
    ? createImageUrlBuilder({
        projectId: sanityEnv.projectId,
        dataset: sanityEnv.dataset,
      })
    : null;

export function getImageBuilder(
  source: SanityImageSource | null | undefined
): ImageUrlBuilder | null {
  if (!builder || !source) {
    return null;
  }

  return builder.image(source);
}

export function buildImageUrl(
  source: SanityImageSource | null | undefined,
  width?: number,
  height?: number
) {
  const imageBuilder = getImageBuilder(source);

  if (!imageBuilder) {
    return null;
  }

  let transformed = imageBuilder.auto('format').fit('crop');

  if (width) {
    transformed = transformed.width(width);
  }

  if (height) {
    transformed = transformed.height(height);
  }

  return transformed.url();
}
