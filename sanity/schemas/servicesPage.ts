import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'servicesPage',
  title: 'Services Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'introSubtitle', title: 'Intro Subtitle', type: 'text', rows: 2, group: 'content' }),
    defineField({
      name: 'processSteps',
      title: 'How an Engagement Works — Steps',
      type: 'array',
      group: 'content',
      of: [{ type: 'string' }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Services Page' }) },
})
