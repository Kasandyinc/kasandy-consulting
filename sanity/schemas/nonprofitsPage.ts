import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'nonprofitsPage',
  title: 'Nonprofits Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'qualifiers', title: '"You\'re in the right place if…" List', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({ name: 'approachBody', title: 'Our Approach — Body', type: 'text', rows: 4, group: 'content' }),
    defineField({
      name: 'faqs', title: 'FAQs', type: 'array', group: 'content',
      of: [{ type: 'object', fields: [{ name: 'q', title: 'Question', type: 'string' }, { name: 'a', title: 'Answer', type: 'text', rows: 3 }], preview: { select: { title: 'q' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Nonprofits Page' }) },
})
