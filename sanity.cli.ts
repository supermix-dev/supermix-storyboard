import { defineCliConfig } from 'sanity/cli';

import { requireSanityEnv } from './sanity/env';

const { projectId, dataset } = requireSanityEnv();

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});

