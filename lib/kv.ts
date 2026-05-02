import { kv } from '@vercel/kv'

// Key names
export const KEYS = {
  testimonials: 'testimonials',
  articles: 'articles',
  speakingPhotos: 'speaking:photos',
  speakingVideos: 'speaking:videos',
  speakingQuotes: 'speaking:quotes',
  siteSettings: 'site:settings',
  pageHeroes: 'page:heroes',
  // Submissions (lpush lists)
  contactSubmissions: 'submissions:contact',
  speakingSubmissions: 'submissions:speaking',
  kenyaWaitlist: 'kenya:waitlist',
  // Subscribers (lpush lists)
  newsletterSubscribers: 'subscribers:newsletter',
  resourceDownloads: 'subscribers:downloads',
  // Downloads (JSON array in a single key)
  downloads: 'downloads:list',
} as const

// Typed getters / setters
export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await kv.get<T>(key)
    return val ?? fallback
  } catch {
    return fallback
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await kv.set(key, value)
}

export { kv }
