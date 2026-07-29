/**
 * E7 — move the legacy /admin CMS's data out of Vercel KV and into Supabase.
 *
 * There is usually no reason to run this. The same import is a button in the hub at
 * /cms/import, which runs on Vercel where the credentials already live — nothing has
 * to be copied to a laptop. This exists for the case where you want the output in a
 * terminal, or the hub is unavailable.
 *
 *   npm run migrate:kv -- --dry-run     # reads everything, writes nothing
 *   npm run migrate:kv                  # applies
 *
 * Needs KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SECRET_KEY. Pull them first with:  vercel env pull .env.local
 *
 * The logic lives in lib/cms/kv-import.ts and is shared with the hub button, so the
 * two cannot drift. It is idempotent and never deletes from KV.
 */

import { createClient } from '@supabase/supabase-js'
import { runKvImport, missingEnv } from '../lib/cms/kv-import.ts'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(dryRun ? '── DRY RUN — nothing will be written ──\n' : '── Importing KV → Supabase ──\n')

  const missing = missingEnv()
  if (missing.length) {
    console.error(`Missing: ${missing.join(', ')}`)
    console.error('Pull them first:  vercel env pull .env.local')
    process.exit(1)
  }

  const summary = await runKvImport({
    supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    }),
    dryRun,
    // No serverless timeout here, so let it run to completion.
    budgetMs: Number.MAX_SAFE_INTEGER,
  })

  console.log('── Summary ──')
  for (const a of summary.areas) {
    console.log(
      `  ${a.area.padEnd(30)} read ${String(a.read).padStart(4)} · ` +
        `${dryRun ? 'would write' : 'wrote'} ${String(a.written).padStart(4)} · ` +
        `skipped ${String(a.skipped).padStart(4)}`,
    )
  }

  for (const e of summary.errors) console.error(`  ! ${e}`)

  console.log(
    dryRun
      ? '\nNothing was written. Re-run without --dry-run to apply.'
      : '\nDone. KV is untouched — the legacy /admin keeps working until it is retired.',
  )

  if (summary.errors.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
