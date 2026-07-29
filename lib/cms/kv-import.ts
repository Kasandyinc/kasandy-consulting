import type { SupabaseClient } from '@supabase/supabase-js'
import { kv, KEYS } from '@/lib/kv'

/**
 * E7 — the legacy /admin CMS's data, moved out of Vercel KV into Supabase.
 *
 * This is the single implementation. The hub's import button and the CLI script both
 * call it, so there is no second copy to drift.
 *
 * Two properties matter more than speed:
 *
 *   • It is idempotent. Re-running never duplicates a row, because a data migration
 *     you are afraid to re-run is one you cannot recover from halfway.
 *   • It never deletes from KV. The old data stays exactly where it is until the
 *     legacy /admin is retired, so a mistake costs a re-run rather than the records.
 *
 * It is also chunked. Running inside a serverless function means a wall-clock limit,
 * and a migration that dies at the timeout having half-finished is only safe *because*
 * of the first property — so the caller can simply run it again to pick up where it
 * stopped. `done` says whether there is more to do.
 */

export type AreaCount = { area: string; read: number; written: number; skipped: number }

export type ImportSummary = {
  dryRun: boolean
  areas: AreaCount[]
  errors: string[]
  /** False when the budget ran out with work remaining — run it again. */
  done: boolean
  elapsedMs: number
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** KV lists are lpush'd JSON strings; some entries may already be objects. */
async function readList(key: string): Promise<Record<string, unknown>[]> {
  try {
    const len = await kv.llen(key)
    if (!len) return []
    const raw = await kv.lrange(key, 0, len - 1)
    return raw
      .map((r) => {
        try {
          return typeof r === 'string' ? JSON.parse(r) : r
        } catch {
          return null
        }
      })
      .filter(Boolean) as Record<string, unknown>[]
  } catch {
    return []
  }
}

/** Read one KV key, tolerating an unreachable store the way readList does. */
async function readKey<T>(key: string): Promise<T | null> {
  try {
    return (await kv.get<T>(key)) ?? null
  } catch {
    return null
  }
}

export function missingEnv(): string[] {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].filter(
    (k) => !process.env[k],
  )
}

export async function runKvImport(opts: {
  supabase: SupabaseClient
  dryRun: boolean
  /** Wall-clock budget in ms. The caller's timeout, minus room to return a response. */
  budgetMs?: number
}): Promise<ImportSummary> {
  const { supabase, dryRun } = opts
  const budgetMs = opts.budgetMs ?? 45_000
  const startedAt = Date.now()
  const areas: AreaCount[] = []
  const errors: string[] = []
  let done = true

  const outOfTime = () => Date.now() - startedAt > budgetMs
  const track = (area: string): AreaCount => {
    const c = { area, read: 0, written: 0, skipped: 0 }
    areas.push(c)
    return c
  }

  // ─── Submissions ──────────────────────────────────────────────────────────
  const submissionSources: {
    key: string
    slug: string
    map: (e: Record<string, unknown>) => {
      name: string | null
      email: string | null
      organisation: string | null
      message: string | null
    }
  }[] = [
    {
      key: KEYS.contactSubmissions,
      slug: 'contact',
      map: (e) => ({
        name: str(e.name),
        email: str(e.email),
        organisation: str(e.organisation),
        message: str(e.message),
      }),
    },
    {
      key: KEYS.speakingSubmissions,
      slug: 'speaking-inquiry',
      map: (e) => ({
        name: str(e.name),
        // This form did not collect an email address until July 2026.
        email: null,
        organisation: str(e.organisation),
        message: str(e.notes),
      }),
    },
    {
      key: KEYS.kenyaWaitlist,
      slug: 'kenya-waitlist',
      map: (e) => ({
        name: str(e.name),
        email: str(e.email),
        organisation: str(e.business),
        message: str(e.goals),
      }),
    },
  ]

  for (const source of submissionSources) {
    const c = track(`submissions:${source.slug}`)
    const entries = await readList(source.key)
    c.read = entries.length

    for (const e of entries) {
      if (outOfTime()) {
        done = false
        break
      }

      // KV entries have no stable id beyond a timestamp, so the form plus the moment
      // it arrived is the only identity available for de-duplication.
      const submittedAt = str(e.createdAt) ?? new Date(Number(e.id) || Date.now()).toISOString()

      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('form_slug', source.slug)
        .eq('submitted_at', submittedAt)
        .maybeSingle()

      if (existing) {
        c.skipped++
        continue
      }
      if (dryRun) {
        c.written++
        continue
      }

      const fields = source.map(e)
      const { error } = await supabase.from('submissions').insert({
        form_slug: source.slug,
        name: fields.name,
        email: fields.email,
        organisation: fields.organisation,
        message: fields.message,
        payload: e,
        submitted_at: submittedAt,
        // Migrated history is not a to-do list; it arrives already dealt with.
        status: 'archived',
      })

      if (error) {
        errors.push(`${source.slug}: ${error.message}`)
        c.skipped++
      } else {
        c.written++
      }
    }
    if (!done) break
  }

  // ─── Subscribers ──────────────────────────────────────────────────────────
  if (done) {
    const c = track('subscribers')
    const [newsletter, downloads] = await Promise.all([
      readList(KEYS.newsletterSubscribers),
      readList(KEYS.resourceDownloads),
    ])
    const all = [
      ...newsletter.map((e) => ({ e, source: 'newsletter form (migrated)' })),
      ...downloads.map((e) => ({ e, source: `resource: ${str(e.resource) ?? 'unknown'} (migrated)` })),
    ]
    c.read = all.length

    for (const { e, source } of all) {
      if (outOfTime()) {
        done = false
        break
      }
      const email = str(e.email)?.toLowerCase()
      if (!email) {
        c.skipped++
        continue
      }

      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .ilike('email', email)
        .maybeSingle()

      if (existing) {
        c.skipped++
        continue
      }
      if (dryRun) {
        c.written++
        continue
      }

      const { error } = await supabase.from('subscribers').insert({
        email,
        name: str(e.name),
        consent_basis: 'express_signup',
        consent_source: source,
        subscribed_at: str(e.createdAt) ?? new Date().toISOString(),
      })

      if (error) {
        errors.push(`subscriber ${email}: ${error.message}`)
        c.skipped++
      } else {
        c.written++
      }
    }
  }

  // ─── Testimonials ─────────────────────────────────────────────────────────
  // The KV records carry an `approved` flag an operator set. That is not the same
  // thing as the author approving the wording, which is what approved_at means here,
  // so these arrive as `received` and need re-confirming before they can publish.
  // Importing the weaker guarantee under the stronger name would be a lie.
  if (done) {
    const c = track('testimonials')
    const reviews = (await readKey<Record<string, unknown>[]>(KEYS.testimonials)) ?? []
    c.read = reviews.length

    for (const r of reviews) {
      if (outOfTime()) {
        done = false
        break
      }
      const name = str(r.name)
      if (!name) {
        c.skipped++
        continue
      }

      const { data: existing } = await supabase
        .from('testimonials')
        .select('id')
        .eq('author_name', name)
        .eq('quote', str(r.quote) ?? '')
        .maybeSingle()

      if (existing) {
        c.skipped++
        continue
      }
      if (dryRun) {
        c.written++
        continue
      }

      const { error } = await supabase.from('testimonials').insert({
        author_name: name,
        author_title: str(r.title),
        author_org: str(r.organisation),
        quote: str(r.quote),
        audience: str(r.audience),
        status: 'received',
      })

      if (error) {
        errors.push(`testimonial ${name}: ${error.message}`)
        c.skipped++
      } else {
        c.written++
      }
    }
  }

  // ─── Articles → posts ─────────────────────────────────────────────────────
  if (done) {
    const c = track('posts')
    const articles = (await readKey<Record<string, unknown>[]>(KEYS.articles)) ?? []
    c.read = articles.length

    for (const a of articles) {
      if (outOfTime()) {
        done = false
        break
      }
      const slug = str(a.slug)
      if (!slug) {
        c.skipped++
        continue
      }

      const { data: existing } = await supabase.from('posts').select('id').eq('slug', slug).maybeSingle()
      if (existing) {
        c.skipped++
        continue
      }
      if (dryRun) {
        c.written++
        continue
      }

      const { error } = await supabase.from('posts').insert({
        slug,
        kind: 'article',
        title: str(a.title) ?? slug,
        excerpt: str(a.excerpt) ?? str(a.summary),
        body_md: str(a.body) ?? str(a.content) ?? '',
        cover_image: str(a.image) ?? str(a.coverImage),
        author: str(a.author),
        // Published in KV means published; the old CMS had no draft state for these.
        status: 'published',
        published_at: str(a.date) ?? str(a.publishedAt) ?? new Date().toISOString(),
      })

      if (error) {
        errors.push(`post ${slug}: ${error.message}`)
        c.skipped++
      } else {
        c.written++
      }
    }
  }

  // ─── Site settings (ad pixel IDs) ─────────────────────────────────────────
  if (done) {
    const c = track('site_settings')
    const settings = (await readKey<Record<string, unknown>>(KEYS.siteSettings)) ?? {}
    c.read = Object.keys(settings).length ? 1 : 0

    if (c.read && !dryRun) {
      const { error } = await supabase
        .from('site_settings')
        .update({
          ga4_id: str(settings.ga4Id) ?? str(settings.ga4),
          meta_pixel_id: str(settings.metaPixelId) ?? str(settings.pixelId),
          contact_email: str(settings.contactEmail),
          default_og_image: str(settings.ogImage),
        })
        .eq('id', true)

      if (error) {
        errors.push(`site settings: ${error.message}`)
        c.skipped++
      } else {
        c.written = 1
      }
    } else if (c.read) {
      c.written = 1
    }
  }

  return { dryRun, areas, errors, done, elapsedMs: Date.now() - startedAt }
}
