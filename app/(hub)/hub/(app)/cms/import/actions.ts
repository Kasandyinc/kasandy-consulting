'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOperator } from '@/lib/engine/operators'
import { runKvImport, missingEnv, type ImportSummary } from '@/lib/cms/kv-import'

/**
 * Run the legacy-CMS import from inside the hub.
 *
 * Doing it here rather than from a laptop means the credentials never leave Vercel —
 * KV and Supabase are both already in this environment, so there is nothing to pull
 * down, store in a local file, or forget to delete afterwards.
 *
 * It uses the admin client because it writes across a dozen operator-owned tables,
 * and it is gated on isOperator() first: this is the one place in the platform where
 * a service key runs on a button press, so the check happens before anything else.
 */
export async function importLegacyCms(dryRun: boolean): Promise<
  { ok: false; error: string } | { ok: true; summary: ImportSummary }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const missing = missingEnv()
  if (missing.length) {
    return {
      ok: false,
      error: `Missing environment variables: ${missing.join(', ')}. Add them in Vercel and redeploy.`,
    }
  }

  let summary: ImportSummary
  try {
    summary = await runKvImport({
      supabase: createAdminClient(),
      dryRun,
      // The page allows 60s; stop at 45 so there is room to write the audit row and
      // return a response rather than being killed mid-flight.
      budgetMs: 45_000,
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'The import failed.' }
  }

  if (!dryRun) {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'cms.legacy_imported',
      entity: 'submissions',
      entity_id: null,
      meta: {
        areas: summary.areas,
        errors: summary.errors,
        complete: summary.done,
      },
    })

    revalidatePath('/cms')
    revalidatePath('/cms/submissions')
    revalidatePath('/cms/subscribers')
    revalidatePath('/cms/content')
  }

  return { ok: true, summary }
}
