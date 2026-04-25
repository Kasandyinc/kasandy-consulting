import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'contact', title: 'Contact' },
    { name: 'social', title: 'Social Links' },
    { name: 'nav', title: 'Navigation' },
  ],
  fields: [
    defineField({ name: 'siteName', title: 'Site Name', type: 'string', initialValue: 'Kasandy Consulting' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', initialValue: 'Where Ambition Meets Access' }),
    defineField({ name: 'email', title: 'Email', type: 'string', group: 'contact', initialValue: 'jackee@kasandy.com' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string', group: 'contact', initialValue: '778-385-4480' }),
    defineField({ name: 'whatsapp', title: 'WhatsApp', type: 'string', group: 'contact', initialValue: '+17783854480' }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'contact', initialValue: 'Vancouver, BC, Canada' }),
    defineField({ name: 'officeHours', title: 'Office Hours', type: 'string', group: 'contact', initialValue: 'Mon–Fri, 9AM–5PM PT' }),
    defineField({ name: 'consultingEmail', title: 'Consulting Email', type: 'string', group: 'contact', initialValue: 'consulting@kasandy.com' }),
    defineField({ name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url', group: 'social' }),
    defineField({ name: 'instagramUrl', title: 'Instagram URL', type: 'url', group: 'social' }),
    defineField({ name: 'facebookUrl', title: 'Facebook URL', type: 'url', group: 'social' }),
    defineField({ name: 'twitterUrl', title: 'Twitter / X URL', type: 'url', group: 'social' }),
    defineField({ name: 'youtubeUrl', title: 'YouTube URL', type: 'url', group: 'social' }),
    defineField({
      name: 'credibilityMarkers',
      title: 'Scrolling Credibility Bar',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Items shown in the scrolling bar on the homepage',
    }),
    defineField({ name: 'calendlyUrl', title: 'Calendly URL', type: 'url', description: 'Used on the Contact page for booking calls' }),
  ],
  preview: { select: { title: 'siteName' } },
})
