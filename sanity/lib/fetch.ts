import type { QueryParams } from 'sanity';

import { sanityClient } from './client';

type SanityFetchArgs = {
  query: string;
  params?: QueryParams;
  revalidate?: number;
};

export async function sanityFetch<T>({
  query,
  params = {},
  revalidate = 60 * 60,
}: SanityFetchArgs): Promise<T | null> {
  if (!sanityClient) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Sanity client is not configured. Did you set your env vars?');
    }

    return null;
  }

  return sanityClient.fetch<T>(query, params, {
    next: {
      revalidate,
    },
  });
}

