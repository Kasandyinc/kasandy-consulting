import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

/** Cache tag the CMS invalidates when a post is saved. */
export const POSTS_TAG = 'site-posts'

export type Post = {
  id: string
  slug: string
  kind: 'article' | 'whitepaper' | 'page'
  title: string
  excerpt: string | null
  body_md: string
  cover_image: string | null
  author: string | null
  tags: string[]
  seo_title: string | null
  seo_description: string | null
  og_image: string | null
  noindex: boolean
  gated: boolean
  published_at: string | null
}

const SELECT =
  'id, slug, kind, title, excerpt, body_md, cover_image, author, tags, seo_title, seo_description, og_image, noindex, gated, published_at'

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Published posts for the public site.
 *
 * Drafts have no anon policy, so this cannot return one even if the query asked for it
 * — the status filter here is for clarity, not for safety. Cached and tagged so the
 * marketing pages stay static between edits.
 */
const cachedPosts = unstable_cache(
  async (kind?: string) => {
    const supabase = anon()
    if (!supabase) return []
    try {
      let query = supabase.from('posts').select(SELECT).eq('status', 'published')
      if (kind) query = query.eq('kind', kind)
      const { data, error } = await query.order('published_at', { ascending: false })
      return error ? [] : ((data ?? []) as Post[])
    } catch {
      return []
    }
  },
  ['site-posts-list'],
  { tags: [POSTS_TAG], revalidate: 300 },
)

const cachedPost = unstable_cache(
  async (slug: string) => {
    const supabase = anon()
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(SELECT)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      return error ? null : ((data ?? null) as Post | null)
    } catch {
      return null
    }
  },
  ['site-post'],
  { tags: [POSTS_TAG], revalidate: 300 },
)

export async function getPosts(kind?: 'article' | 'whitepaper' | 'page'): Promise<Post[]> {
  try {
    return await cachedPosts(kind)
  } catch {
    return []
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    return await cachedPost(slug)
  } catch {
    return null
  }
}
