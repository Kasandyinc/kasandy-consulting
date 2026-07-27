import { MetadataRoute } from 'next'
import { articles } from '@/data/articles'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kasandyconsulting.com'
  const now = new Date()

  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '',               priority: 1.0, freq: 'weekly'  },
    { path: '/about',         priority: 0.9, freq: 'monthly' },
    { path: '/services',      priority: 0.9, freq: 'monthly' },
    { path: '/entrepreneurs', priority: 0.8, freq: 'monthly' },
    { path: '/government',    priority: 0.8, freq: 'monthly' },
    { path: '/nonprofits',    priority: 0.8, freq: 'monthly' },
    { path: '/kenya',         priority: 0.8, freq: 'monthly' },
    { path: '/speaking',      priority: 0.8, freq: 'monthly' },
    { path: '/contact',       priority: 0.8, freq: 'monthly' },
    { path: '/resources',     priority: 0.9, freq: 'weekly'  }, // revenue page — 14 paid products
    { path: '/work',          priority: 0.7, freq: 'monthly' },
    { path: '/press',         priority: 0.7, freq: 'weekly'  },
    { path: '/terms',         priority: 0.4, freq: 'yearly'  },
  ]

  const staticPages = pages.map(p => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }))

  // Individual article pages
  const articlePages = articles
    .filter(a => a.published)
    .map(a => ({
      url: `${base}/resources/articles/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  return [...staticPages, ...articlePages]
}
