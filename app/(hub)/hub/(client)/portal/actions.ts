'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Mark a phase verified live.
 *
 * This runs on the *client's own session* — deliberately not the admin client. The
 * database trigger checks that whoever is writing is a client user of the client that
 * owns the engagement, and refuses operators and strangers alike. Using a service key
 * here would bypass the very rule this action exists to honour.
 */
export async function verifyPhase(args: { phaseId: string; note: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Please sign in again.' }

  const { data, error } = await supabase
    .from('engagement_phases')
    .update({
      verified_at: new Date().toISOString(),
      verify_note: args.note.trim() || null,
    })
    .eq('id', args.phaseId)
    .select('id, name, engagement_id')

  // The trigger's messages are written to be read by the client, so pass them through.
  if (error) return { ok: false, error: error.message }

  // RLS filtered the row out rather than raising: this phase is not theirs.
  if (!data?.length) {
    return { ok: false, error: 'That phase is not part of your engagement.' }
  }

  await supabase.from('audit_log').insert({
    actor: user.email,
    action: 'phase.verified',
    entity: 'engagement_phases',
    entity_id: args.phaseId,
    meta: { name: data[0].name, note: args.note.trim() || null },
  })

  revalidatePath('/portal')
  return { ok: true }
}
