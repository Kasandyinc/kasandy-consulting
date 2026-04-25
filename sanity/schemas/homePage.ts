import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'stats', title: 'Impact Stats' },
    { name: 'about', title: 'About Snippet' },
    { name: 'cta', title: 'CTA Banner' },
  ],
  fields: [
    defineField({ name: 'heroLabel', title: 'Hero Label', type: 'string', group: 'hero', initialValue: "Canada's Leading Procurement Strategist & Business Coach" }),
    defineField({ name: 'heroHeading', title: 'Hero Heading', type: 'string', group: 'hero', initialValue: 'Where Ambition\nMeets Access.' }),
    defineField({ name: 'heroSubtitle', title: 'Hero Subtitle', type: 'text', rows: 2, group: 'hero' }),
    defineField({ name: 'heroImage', title: 'Hero Photo', type: 'image', options: { hotspot: true }, group: 'hero', description: 'Main photo on right side of homepage' }),
    defineField({
      name: 'stats',
      title: 'Impact Stats',
      type: 'array',
      group: 'stats',
      of: [{
        type: 'object',
        fields: [
          { name: 'number', title: 'Number / Label', type: 'string' },
          { name: 'label', title: 'Description', type: 'string' },
        ],
        preview: { select: { title: 'number', subtitle: 'label' } },
      }],
    }),
    defineField({ name: 'aboutLabel', title: 'About Section Label', type: 'string', group: 'about', initialValue: 'Meet Your Strategic Partner' }),
    defineField({ name: 'aboutBio', title: 'About Bio Paragraph', type: 'text', rows: 4, group: 'about' }),
    defineField({ name: 'aboutPhoto', title: 'About Photo', type: 'image', options: { hotspot: true }, group: 'about' }),
    defineField({ name: 'ctaHeading', title: 'CTA Banner Heading', type: 'string', group: 'cta', initialValue: 'Ready to get to work?' }),
    defineField({ name: 'ctaBody', title: 'CTA Banner Body', type: 'text', rows: 2, group: 'cta' }),
    defineField({
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'Images shown in the "In The Room" gallery strip (8 images recommended)',
    }),
  ],
  preview: { select: { title: 'heroHeading' }, prepare: () => ({ title: 'Home Page' }) },
})
