import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'workPage',
  title: 'Work / Results Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({
      name: 'stats',
      title: 'Impact Stats',
      type: 'array',
      group: 'content',
      of: [{ type: 'object', fields: [{ name: 'value', title: 'Value', type: 'string' }, { name: 'label', title: 'Label', type: 'string' }], preview: { select: { title: 'value', subtitle: 'label' } } }],
    }),
    defineField({
      name: 'caseStudies',
      title: 'Case Studies',
      type: 'array',
      group: 'content',
      of: [{
        type: 'object',
        fields: [
          { name: 'number', title: 'Number (01, 02…)', type: 'string' },
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'client', title: 'Client', type: 'string' },
          { name: 'tagline', title: 'Tagline', type: 'text', rows: 2 },
          { name: 'challenge', title: 'The Challenge', type: 'text', rows: 4 },
          { name: 'approach', title: 'Approach Items', type: 'array', of: [{ type: 'string' }] },
          { name: 'results', title: 'Results Items', type: 'array', of: [{ type: 'string' }] },
        ],
        preview: { select: { title: 'label', subtitle: 'client' } },
      }],
    }),
    defineField({ name: 'partners', title: 'Partners & Funders', type: 'array', of: [{ type: 'string' }], group: 'content' }),
  ],
  preview: { prepare: () => ({ title: 'Work / Results Page' }) },
})
