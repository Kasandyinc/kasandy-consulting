'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemas'

const singletons = [
  'siteSettings', 'homePage', 'aboutPage',
  'entrepreneursPage', 'governmentPage', 'nonprofitsPage',
  'kenyaPage', 'speakingPage', 'workPage',
  'pressPage', 'servicesPage', 'contactPage',
]

export default defineConfig({
  name: 'kasandy-consulting',
  title: 'Kasandy Consulting CMS',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem().title('⚙️  Site Settings').id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.listItem().title('🏠  Home Page').id('homePage')
              .child(S.document().schemaType('homePage').documentId('homePage')),
            S.listItem().title('👤  About Page').id('aboutPage')
              .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
            S.listItem().title('🛠️  Services Page').id('servicesPage')
              .child(S.document().schemaType('servicesPage').documentId('servicesPage')),
            S.divider(),
            S.listItem().title('💼  Entrepreneurs Page').id('entrepreneursPage')
              .child(S.document().schemaType('entrepreneursPage').documentId('entrepreneursPage')),
            S.listItem().title('🏛️  Government Page').id('governmentPage')
              .child(S.document().schemaType('governmentPage').documentId('governmentPage')),
            S.listItem().title('🤝  Nonprofits Page').id('nonprofitsPage')
              .child(S.document().schemaType('nonprofitsPage').documentId('nonprofitsPage')),
            S.listItem().title('🌍  Kenya & International Page').id('kenyaPage')
              .child(S.document().schemaType('kenyaPage').documentId('kenyaPage')),
            S.divider(),
            S.listItem().title('🎤  Speaking Page').id('speakingPage')
              .child(S.document().schemaType('speakingPage').documentId('speakingPage')),
            S.listItem().title('📊  Work / Results Page').id('workPage')
              .child(S.document().schemaType('workPage').documentId('workPage')),
            S.listItem().title('📰  Press Page').id('pressPage')
              .child(S.document().schemaType('pressPage').documentId('pressPage')),
            S.listItem().title('📬  Contact Page').id('contactPage')
              .child(S.document().schemaType('contactPage').documentId('contactPage')),
            S.divider(),
            S.documentTypeListItem('testimonial').title('⭐  Testimonials'),
            S.documentTypeListItem('pressItem').title('📰  Press Coverage'),
            S.documentTypeListItem('resource').title('📚  Resources / Blog'),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
  document: {
    newDocumentOptions: (prev, { creationContext }) =>
      singletons.includes(creationContext.schemaType ?? '')
        ? []
        : prev,
    actions: (prev, { schemaType }) =>
      singletons.includes(schemaType)
        ? prev.filter(a => a.action !== 'duplicate' && a.action !== 'unpublish')
        : prev,
  },
})
