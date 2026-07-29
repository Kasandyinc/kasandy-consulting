import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

/** Cache tag the CMS invalidates when SEO or pixel settings change. */
export const SEO_TAG = 'site-seo'

export type PageMeta = {
  path: string
  title: string | null
  description: string | null
  og_image: string | null
  noindex: boolean
}

export type SiteSettings = {
  ga4_id: string | null
  meta_pixel_id: string | null
  linkedin_partner_id: string | null
  pixels_enabled: boolean
  default_og_image: string | null
  contact_email: string | null
}

/**
 * Per-page SEO and the site's tracking configuration, for the marketing layout.
 *
 * Cached and tagged for the same reason the forms are: an uncached read here would
 * make every marketing page dynamic. Both readers fall back to null rather than
 * throwing — a page must render its content even if its metadata is unavailable.
 */
async function read<T>(table: string, filter?: { column: string; value: string }): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const query = supabase.from(table).select('*')
    const { data, error } = filter
      ? await query.eq(filter.column, filter.value).maybeSingle()
      : await query.limit(1).maybeSingle()

    if (error) return null
    return (data ?? null) as T | null
  } catch {
    return null
  }
}

const cachedPageMeta = unstable_cache(
  async (path: string) => read<PageMeta>('page_meta', { column: 'path', value: path }),
  ['page-meta'],
  { tags: [SEO_TAG], revalidate: 300 },
)

const cachedSettings = unstable_cache(async () => read<SiteSettings>('site_settings'), ['site-settings'], {
  tags: [SEO_TAG],
  revalidate: 300,
})

export async function getPageMeta(path: string): Promise<PageMeta | null> {
  try {
    return await cachedPageMeta(path)
  } catch {
    return null
  }
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    return await cachedSettings()
  } catch {
    return null
  }
}
