import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

const faqFields = [
  { name: 'q', title: 'Question', type: 'string' },
  { name: 'a', title: 'Answer', type: 'text', rows: 3 },
]

export default defineType({
  name: 'entrepreneursPage',
  title: 'Entrepreneurs Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }, { name: 'faqs', title: 'FAQs' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'qualifiers', title: '"This is for you if…" List', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({ name: 'jackeeBody', title: 'What Jackee Brings — Body', type: 'text', rows: 4, group: 'content' }),
    defineField({ name: 'outcomes', title: 'Client Outcomes List', type: 'array', of: [{ type: 'string' }], group: 'content' }),
    defineField({
      name: 'faqs', title: 'FAQs', type: 'array', group: 'faqs',
      of: [{ type: 'object', fields: faqFields, preview: { select: { title: 'q' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Entrepreneurs Page' }) },
})
