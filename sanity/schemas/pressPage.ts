import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'pressPage',
  title: 'Press Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }, { name: 'content', title: 'Content' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({
      name: 'mediaStats',
      title: 'Media Stats Bar',
      type: 'array',
      group: 'content',
      of: [{ type: 'object', fields: [{ name: 'number', title: 'Number', type: 'string' }, { name: 'label', title: 'Label', type: 'string' }], preview: { select: { title: 'number', subtitle: 'label' } } }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Press Page' }) },
})
