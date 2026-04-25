import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kasandyconsulting.com'
  const now = new Date()

  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '',             priority: 1.0, freq: 'weekly' },
    { path: '/about',       priority: 0.9, freq: 'monthly' },
    { path: '/services',    priority: 0.9, freq: 'monthly' },
    { path: '/entrepreneurs', priority: 0.8, freq: 'monthly' },
    { path: '/government',  priority: 0.8, freq: 'monthly' },
    { path: '/nonprofits',  priority: 0.8, freq: 'monthly' },
    { path: '/kenya',       priority: 0.8, freq: 'monthly' },
    { path: '/speaking',    priority: 0.8, freq: 'monthly' },
    { path: '/work',        priority: 0.7, freq: 'monthly' },
    { path: '/press',       priority: 0.7, freq: 'weekly' },
    { path: '/resources',   priority: 0.6, freq: 'weekly' },
    { path: '/contact',     priority: 0.8, freq: 'monthly' },
  ]

  return pages.map(p => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }))
}
