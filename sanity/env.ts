type SanityEnv = {
  projectId?: string;
  dataset?: string;
  apiVersion: string;
  studioBasePath: string;
};

export const sanityEnv: SanityEnv = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2025-01-01',
  studioBasePath: '/studio',
};

export function requireSanityEnv(): Required<SanityEnv> {
  const { projectId, dataset, apiVersion, studioBasePath } = sanityEnv;

  if (!projectId) {
    throw new Error(
      'Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable.'
    );
  }

  if (!dataset) {
    throw new Error('Missing NEXT_PUBLIC_SANITY_DATASET environment variable.');
  }

  return {
    projectId,
    dataset,
    apiVersion,
    studioBasePath,
  };
}
