import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'mediaItem',
  title: 'Media Item',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(5),
    }),
    defineField({
      name: 'image',
      title: 'Thumbnail',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the thumbnail for screen readers.',
          validation: (Rule) =>
            Rule.required()
              .min(5)
              .error('Please provide descriptive alt text.'),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Media URL',
      type: 'url',
      validation: (Rule) =>
        Rule.required().uri({
          scheme: ['http', 'https'],
        }),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'url',
      media: 'image',
    },
  },
});
