'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

const STATUSES = ['new', 'read', 'actioned', 'spam', 'archived']

export async function setSubmissionStatus(args: { id: string; status: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!STATUSES.includes(args.status)) return { ok: false, error: 'Unknown status.' }

  const { error } = await supabase
    .from('submissions')
    .update({
      status: args.status,
      handled_by: user!.email,
      handled_at: new Date().toISOString(),
    })
    .eq('id', args.id)

  if (error) return { ok: false, error: error.message }

  // Marking something as spam is a signal worth keeping — it is how we would ever
  // learn that a control is letting things through.
  if (args.status === 'spam') {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'submission.marked_spam',
      entity: 'submissions',
      entity_id: args.id,
      meta: {},
    })
  }

  revalidatePath('/cms/submissions')
  return { ok: true }
}
