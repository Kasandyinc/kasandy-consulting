import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'resource',
  title: 'Resources / Blog',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: r => r.required() }),
    defineField({ name: 'category', title: 'Category', type: 'string', options: { list: ['Guide', 'Template', 'Checklist', 'Article', 'Video', 'Webinar'] } }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }] }),
    defineField({ name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'datetime' }),
    defineField({ name: 'published', title: 'Published?', type: 'boolean', initialValue: false }),
    defineField({ name: 'downloadUrl', title: 'Download URL (optional)', type: 'url', description: 'If this resource links to a file instead of a body' }),
    defineField({ name: 'requiresEmail', title: 'Requires Email to Access?', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'title', subtitle: 'category', media: 'coverImage' } },
})
