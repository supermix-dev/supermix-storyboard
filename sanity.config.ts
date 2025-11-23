import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { SITE_TITLE } from './lib/constants';
import { requireSanityEnv } from './sanity/env';
import { schemaTypes } from './sanity/schemaTypes';

const { projectId, dataset, studioBasePath, apiVersion } = requireSanityEnv();

export default defineConfig({
  name: 'what-founders-think',
  title: SITE_TITLE,
  projectId,
  dataset,
  basePath: studioBasePath,
  schema: {
    types: schemaTypes,
  },
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
});
