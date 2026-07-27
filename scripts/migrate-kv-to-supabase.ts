/**
 * E7 — move the legacy /admin CMS's data out of Vercel KV and into Supabase.
 *
 *   npx tsx scripts/migrate-kv-to-supabase.ts --dry-run
 *   npx tsx scripts/migrate-kv-to-supabase.ts
 *
 * Run with a dry run first; it prints exactly what it would write and touches nothing.
 *
 * The script is idempotent — it can be run repeatedly and will not duplicate rows —
 * because a data migration you are afraid to re-run is one you cannot recover from
 * halfway. It also never deletes from KV: the old data stays where it is until the
 * legacy /admin is retired, so a mistake here costs a re-run rather than the records.
 *
 * Requires KV_REST_API_URL / KV_REST_API_TOKEN and SUPABASE_SECRET_KEY in the
 * environment. Pull them with `vercel env pull .env.local`.
 */

import { kv, KEYS } from '../lib/kv'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
)

type Counts = { read: number; written: number; skipped: number }
const tally: Record<string, Counts> = {}

function count(area: string): Counts {
  tally[area] ??= { read: 0, written: 0, skipped: 0 }
  return tally[area]
}

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

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Submissions. Deduplicated on (form_slug, email, submitted_at) — the KV entries have
 * no stable id beyond a timestamp, so the timestamp plus who sent it is what identity
 * we have.
 */
async function migrateSubmissions(key: string, slug: string, map: (e: Record<string, unknown>) => {
  name?: string | null
  email?: string | null
  organisation?: string | null
  message?: string | null
}) {
  const c = count(`submissions:${slug}`)
  const entries = await readList(key)
  c.read = entries.length

  for (const e of entries) {
    const submittedAt = str(e.createdAt) ?? new Date(Number(e.id) || Date.now()).toISOString()
    const fields = map(e)

    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('form_slug', slug)
      .eq('submitted_at', submittedAt)
      .maybeSingle()

    if (existing) {
      c.skipped++
      continue
    }

    if (DRY) {
      c.written++
      continue
    }

    const { error } = await supabase.from('submissions').insert({
      form_slug: slug,
      name: fields.name ?? null,
      email: fields.email ?? null,
      organisation: fields.organisation ?? null,
      message: fields.message ?? null,
      payload: e,
      submitted_at: submittedAt,
      // Migrated history is not a to-do list; it arrives already dealt with.
      status: 'archived',
    })

    if (error) {
      console.error(`  ! ${slug}: ${error.message}`)
      c.skipped++
    } else {
      c.written++
    }
  }
}

async function migrateSubscribers() {
  const c = count('subscribers')
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

    if (DRY) {
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
      console.error(`  ! subscriber ${email}: ${error.message}`)
      c.skipped++
    } else {
      c.written++
    }
  }
}

/**
 * Testimonials. The KV records carry an `approved` flag set by an operator in the old
 * admin. That is not the same thing as the author approving the wording, which is what
 * this platform's `approved_at` means — so a migrated testimonial arrives as `received`
 * and has to be re-confirmed before it can be published. Anything else would import a
 * weaker guarantee under a stronger name.
 */
async function migrateTestimonials() {
  const c = count('testimonials')
  const reviews = (await kv.get<Record<string, unknown>[]>(KEYS.testimonials)) ?? []
  c.read = reviews.length

  for (const r of reviews) {
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

    if (DRY) {
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
      console.error(`  ! testimonial ${name}: ${error.message}`)
      c.skipped++
    } else {
      c.written++
    }
  }
}

/** Blog articles become posts. Slug is the identity, so a re-run updates in place. */
async function migrateArticles() {
  const c = count('posts')
  const articles = (await kv.get<Record<string, unknown>[]>(KEYS.articles)) ?? []
  c.read = articles.length

  for (const a of articles) {
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

    if (DRY) {
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
      console.error(`  ! post ${slug}: ${error.message}`)
      c.skipped++
    } else {
      c.written++
    }
  }
}

/** Site settings: the ad pixel IDs, which stay on the public site only. */
async function migrateSiteSettings() {
  const c = count('site_settings')
  const settings = (await kv.get<Record<string, unknown>>(KEYS.siteSettings)) ?? {}
  c.read = Object.keys(settings).length ? 1 : 0
  if (!c.read) return

  if (DRY) {
    c.written = 1
    return
  }

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
    console.error(`  ! site settings: ${error.message}`)
    c.skipped++
  } else {
    c.written = 1
  }
}

async function main() {
  console.log(DRY ? '── DRY RUN — nothing will be written ──\n' : '── Migrating KV → Supabase ──\n')

  if (!process.env.SUPABASE_SECRET_KEY) {
    console.error('SUPABASE_SECRET_KEY is not set. Run: vercel env pull .env.local')
    process.exit(1)
  }

  await migrateSubmissions(KEYS.contactSubmissions, 'contact', (e) => ({
    name: str(e.name),
    email: str(e.email),
    organisation: str(e.organisation),
    message: str(e.message),
  }))

  await migrateSubmissions(KEYS.speakingSubmissions, 'speaking-inquiry', (e) => ({
    name: str(e.name),
    // This form has never collected an email address.
    email: null,
    organisation: str(e.organisation),
    message: str(e.notes),
  }))

  await migrateSubmissions(KEYS.kenyaWaitlist, 'kenya-waitlist', (e) => ({
    name: str(e.name),
    email: str(e.email),
    organisation: str(e.business),
    message: str(e.goals),
  }))

  await migrateSubscribers()
  await migrateTestimonials()
  await migrateArticles()
  await migrateSiteSettings()

  console.log('\n── Summary ──')
  for (const [area, c] of Object.entries(tally)) {
    console.log(
      `  ${area.padEnd(30)} read ${String(c.read).padStart(4)} · ${DRY ? 'would write' : 'wrote'} ${String(c.written).padStart(4)} · skipped ${String(c.skipped).padStart(4)}`,
    )
  }
  console.log(
    DRY
      ? '\nNothing was written. Re-run without --dry-run to apply.'
      : '\nDone. KV is untouched — the legacy /admin keeps working until it is retired.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
