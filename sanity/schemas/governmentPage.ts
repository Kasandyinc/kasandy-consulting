import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'governmentPage',
  title: 'Government Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'qualifiers', title: 'Right Fit — List', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({ name: 'credibilityBody', title: 'Why Govt Clients Choose Us — Body', type: 'text', rows: 4, group: 'content' }),
    defineField({ name: 'trackRecord', title: 'Track Record Items', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({
      name: 'faqs', title: 'FAQs', type: 'array', group: 'content',
      of: [{ type: 'object', fields: [{ name: 'q', title: 'Question', type: 'string' }, { name: 'a', title: 'Answer', type: 'text', rows: 3 }], preview: { select: { title: 'q' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Government Page' }) },
})
