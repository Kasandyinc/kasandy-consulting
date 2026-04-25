import { defineField } from 'sanity'

export const heroFields = [
  defineField({ name: 'heroImage', title: 'Hero Photo', type: 'image', options: { hotspot: true }, description: 'Background photo for the page hero banner' }),
  defineField({ name: 'heroLabel', title: 'Hero Label', type: 'string', description: 'Small uppercase label above the title' }),
  defineField({ name: 'heroTitle', title: 'Hero Title', type: 'string' }),
  defineField({ name: 'heroSubtitle', title: 'Hero Subtitle', type: 'text', rows: 2 }),
  defineField({ name: 'heroImagePosition', title: 'Hero Image Position', type: 'string', options: { list: ['object-top', 'object-center', 'object-bottom'] }, initialValue: 'object-center' }),
]
