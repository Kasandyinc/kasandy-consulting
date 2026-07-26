'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

/**
 * Owner-only sign-off for a Black-led / Indigenous-serving org (§7.2).
 * Until this is granted, the database refuses every send to the org. Approving is
 * a deliberate, attributed, audit-logged act — never automatic.
 */
export async function approveSignOff(orgId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) {
    return { ok: false, error: 'Not authorized.' }
  }

  const { error } = await supabase
    .from('orgs')
    .update({
      signoff_status: 'approved',
      signoff_by: user!.email,
      signoff_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'signoff.approved',
    entity: 'orgs',
    entity_id: orgId,
    meta: { note: 'Black-led / Indigenous-serving sign-off granted by Owner' },
  })

  revalidatePath(`/outreach/${orgId}`)
  revalidatePath('/outreach')
  revalidatePath('/')
  return { ok: true }
}
