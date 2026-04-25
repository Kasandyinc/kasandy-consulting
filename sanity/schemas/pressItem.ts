import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'pressItem',
  title: 'Press Coverage',
  type: 'document',
  fields: [
    defineField({ name: 'outlet', title: 'Media Outlet', type: 'string', validation: r => r.required() }),
    defineField({ name: 'title', title: 'Article Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'url', title: 'Article URL', type: 'url', validation: r => r.required() }),
    defineField({ name: 'summary', title: 'Summary', type: 'text', rows: 3 }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: ['Print / Online', 'TV / Online', 'TV / Radio / Online', 'Magazine / Online', 'Magazine', 'Online', 'Recognition'] },
    }),
    defineField({ name: 'date', title: 'Date', type: 'date' }),
    defineField({ name: 'featured', title: 'Featured?', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'title', subtitle: 'outlet' } },
  orderings: [{ title: 'Featured first', name: 'featuredDesc', by: [{ field: 'featured', direction: 'desc' }, { field: 'date', direction: 'desc' }] }],
})
