import { defineField, defineType } from 'sanity'
import { heroFields } from './pageBase'

export default defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  groups: [{ name: 'hero', title: 'Hero' }],
  fields: [
    ...heroFields.map(f => ({ ...f, group: 'hero' })),
    defineField({ name: 'introText', title: 'Intro Text', type: 'text', rows: 2 }),
    defineField({ name: 'scheduleHeading', title: 'Schedule Section Heading', type: 'string', initialValue: 'Schedule a Strategy Call' }),
    defineField({ name: 'scheduleBody', title: 'Schedule Section Body', type: 'text', rows: 2 }),
    defineField({ name: 'formHeading', title: 'Form Section Heading', type: 'string', initialValue: 'Tell us about your project.' }),
    defineField({ name: 'formBody', title: 'Form Section Body', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Contact Page' }) },
})
