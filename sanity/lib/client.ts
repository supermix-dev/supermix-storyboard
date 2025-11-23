import { createClient } from 'next-sanity';

import { sanityEnv } from '../env';

export const sanityClient = sanityEnv.projectId && sanityEnv.dataset
  ? createClient({
      projectId: sanityEnv.projectId,
      dataset: sanityEnv.dataset,
      apiVersion: sanityEnv.apiVersion,
      useCdn: process.env.NODE_ENV === 'production',
      stega: {
        enabled: false,
      },
    })
  : null;

