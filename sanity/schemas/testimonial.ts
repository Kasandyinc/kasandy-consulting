import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'testimonial',
  title: 'Testimonials',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'title', title: 'Job Title', type: 'string' }),
    defineField({ name: 'organisation', title: 'Organisation', type: 'string' }),
    defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: r => r.required() }),
    defineField({ name: 'audience', title: 'Audience / Context', type: 'string', description: 'e.g. Entrepreneur, Government, Non-Profit' }),
    defineField({ name: 'featured', title: 'Featured?', type: 'boolean', initialValue: false }),
    defineField({ name: 'approved', title: 'Approved / Published?', type: 'boolean', initialValue: false }),
    defineField({ name: 'photo', title: 'Photo', type: 'image', options: { hotspot: true } }),
  ],
  preview: { select: { title: 'name', subtitle: 'organisation', media: 'photo' } },
  orderings: [{ title: 'Featured first', name: 'featuredDesc', by: [{ field: 'featured', direction: 'desc' }] }],
})
