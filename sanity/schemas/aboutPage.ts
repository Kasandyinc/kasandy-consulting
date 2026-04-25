import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'bio', title: 'Bio' }, { name: 'firm', title: 'The Firm' }, { name: 'values', title: 'Values' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'firmBody', title: 'About the Firm — Body', type: 'array', of: [{ type: 'block' }], group: 'firm' }),
    defineField({ name: 'bioBody', title: "Jackee's Bio — Body", type: 'array', of: [{ type: 'block' }], group: 'bio' }),
    defineField({ name: 'portraitPhoto', title: 'Portrait Photo', type: 'image', options: { hotspot: true }, group: 'bio' }),
    defineField({
      name: 'credentials',
      title: 'Credentials List',
      type: 'array',
      group: 'bio',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'value', title: 'Value', type: 'string' },
        ],
        preview: { select: { title: 'label', subtitle: 'value' } },
      }],
    }),
    defineField({
      name: 'values',
      title: 'Values',
      type: 'array',
      group: 'values',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Title', type: 'string' },
          { name: 'body', title: 'Body', type: 'text', rows: 3 },
        ],
        preview: { select: { title: 'title' } },
      }],
    }),
    defineField({
      name: 'recognition',
      title: 'Recognition Items',
      type: 'array',
      group: 'bio',
      of: [{ type: 'string' }],
    }),
  ],
  preview: { prepare: () => ({ title: 'About Page' }) },
})
