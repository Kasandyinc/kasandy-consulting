import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { FORM_DEFAULTS, rowToConfig, type FormConfig } from './config'

/** Cache tag the CMS invalidates on save, so an edit is live immediately. */
export const FORMS_TAG = 'site-forms'

/**
 * Read a form's configuration for the public site.
 *
 * This runs on the marketing host, which has no operator session, so it uses a plain
 * anon client — the `site_forms_public_read` policy exposes active forms and nothing
 * else.
 *
 * The read goes through unstable_cache rather than a plain query. That matters for more
 * than load: an uncached read makes every page that renders a form dynamic, which turned
 * /contact from a static page into a per-request render. Caching keeps those pages
 * static and still lets a CMS save publish immediately, because saving revalidates
 * FORMS_TAG.
 *
 * Any failure falls back to the compiled default. A contact form that fails closed
 * because the hub's database is unreachable would be worse than one running stale copy.
 */
async function readForm(slug: string): Promise<FormConfig | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase
      .from('site_forms')
      .select('slug, name, description, fields, submit_label, success_message, notify_email, active')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) return null
    return rowToConfig(data)
  } catch {
    return null
  }
}

const cachedReadForm = unstable_cache(readForm, ['site-form'], {
  tags: [FORMS_TAG],
  revalidate: 300,
})

export async function getFormConfig(slug: string): Promise<FormConfig> {
  const fallback = FORM_DEFAULTS[slug]
  try {
    return (await cachedReadForm(slug)) ?? fallback
  } catch {
    return fallback
  }
}
