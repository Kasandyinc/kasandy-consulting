import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'kenyaPage',
  title: 'Kenya & International Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'opportunityBody', title: 'The Opportunity — Body', type: 'array', of: [{ type: 'block' }], group: 'content' }),
    defineField({ name: 'seminarTopics', title: 'What Participants Learn', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({ name: 'qualifiers', title: '"This program is for you if…" List', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({
      name: 'faqs', title: 'FAQs', type: 'array', group: 'content',
      of: [{ type: 'object', fields: [{ name: 'q', title: 'Question', type: 'string' }, { name: 'a', title: 'Answer', type: 'text', rows: 3 }], preview: { select: { title: 'q' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Kenya & International Page' }) },
})
