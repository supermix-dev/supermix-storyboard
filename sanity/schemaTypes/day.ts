import { defineField, defineType, type ValidationContext } from 'sanity';

import { sanityEnv } from '../env';

const { apiVersion } = sanityEnv;

export default defineType({
  name: 'day',
  title: 'Day',
  type: 'document',
  fields: [
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      options: {
        dateFormat: 'dddd, MMMM D, YYYY',
      },
      validation: (Rule) =>
        Rule.required().custom(async (date, context: ValidationContext) => {
          if (!date) {
            return true;
          }

          const docId = context?.document?._id?.replace(/^drafts\./, '');
          const params = {
            date,
            draftId: docId ? `drafts.${docId}` : '__no_draft__',
            publishedId: docId ?? '__no_doc__',
          };

          const client = context.getClient({ apiVersion });

          const conflictingId = await client.fetch<string | null>(
            '*[_type == "day" && date == $date && !(_id in [$draftId, $publishedId])][0]._id',
            params
          );

          return conflictingId
            ? 'A Day already exists for this calendar date. Update the existing entry instead.'
            : true;
        }),
    }),
    defineField({
      name: 'items',
      title: 'Media Items',
      type: 'array',
      of: [{ type: 'mediaItem' }],
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .max(10)
          .custom((items) => {
            const duplicateUrl = findDuplicateUrl(
              items as MediaItemValue[] | undefined
            );

            return duplicateUrl
              ? `Each media item must have a unique URL. Duplicate found: ${duplicateUrl}`
              : true;
          }),
    }),
  ],
  preview: {
    select: {
      title: 'date',
      subtitle: 'items.length',
    },
    prepare(selection) {
      const { title, subtitle } = selection as {
        title?: string;
        subtitle?: number;
      };

      return {
        title,
        subtitle: subtitle
          ? `${subtitle} recommendation(s)`
          : '0 recommendation(s)',
      };
    },
  },
});

type MediaItemValue = {
  url?: string | null;
} | null;

function findDuplicateUrl(items: MediaItemValue[] | undefined) {
  if (!Array.isArray(items)) {
    return null;
  }

  const seen = new Set<string>();

  for (const item of items) {
    const url = item?.url?.trim();

    if (!url) {
      continue;
    }

    if (seen.has(url)) {
      return url;
    }

    seen.add(url);
  }

  return null;
}
