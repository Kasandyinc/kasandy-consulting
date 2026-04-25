import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'speakingPage',
  title: 'Speaking Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'aboutBody', title: 'About Jackee as a Speaker — Body', type: 'array', of: [{ type: 'block' }], group: 'content' }),
    defineField({
      name: 'topics',
      title: 'Speaking Topics',
      type: 'array',
      group: 'content',
      of: [{
        type: 'object',
        fields: [
          { name: 'number', title: 'Number (01, 02…)', type: 'string' },
          { name: 'title', title: 'Topic Title', type: 'string' },
          { name: 'description', title: 'Description', type: 'text', rows: 4 },
          { name: 'audience', title: 'Ideal Audience', type: 'string' },
        ],
        preview: { select: { title: 'title', subtitle: 'number' } },
      }],
    }),
    defineField({
      name: 'formats',
      title: 'Available Formats',
      type: 'array',
      group: 'content',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', title: 'Format Name', type: 'string' },
          { name: 'detail', title: 'Detail (e.g. 45–60 min)', type: 'string' },
        ],
        preview: { select: { title: 'name', subtitle: 'detail' } },
      }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Speaking Page' }) },
})
