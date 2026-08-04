'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/spam'
import type { IntakeQuestion } from '@/lib/engine/delivery'

/**
 * Save intake answers.
 *
 * The token authorises the write, and it is the only thing that does — the intake id
 * is never accepted from the client. A submitted intake is closed: reopening it would
 * let anyone holding the link rewrite answers KC has already worked from.
 */
export async function saveIntake(args: {
  token: string
  answers: Record<string, string>
  submit: boolean
}) {
  if (!/^[0-9a-f]{32,64}$/i.test(args.token)) return { ok: false, error: 'Invalid link.' }

  // Unauthenticated, and it runs on the service role. The token is 192 bits, so this
  // is not about guessing it — it is about anyone holding a forwarded link not being
  // able to write to a jsonb column as fast as they can send requests.
  const ip = (headers().get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (!(await rateLimit(`intake:${ip}`, 60, 3600))) {
    return { ok: false, error: 'Too many saves. Please wait a few minutes and try again.' }
  }

  const supabase = createAdminClient()
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, org_id, form_id, submitted_at')
    .eq('token', args.token)
    .maybeSingle()

  if (!intake) return { ok: false, error: 'This link is not valid.' }
  if (intake.submitted_at) {
    return { ok: false, error: 'This intake has already been submitted. Contact us to change an answer.' }
  }

  const { data: form } = intake.form_id
    ? await supabase.from('intake_forms').select('questions').eq('id', intake.form_id).maybeSingle()
    : await supabase.from('intake_forms').select('questions').eq('slug', 'discovery-intake').maybeSingle()

  const questions = (form?.questions ?? []) as IntakeQuestion[]
  const allowed = new Set(questions.map((q) => q.key))

  // Only keys the form actually asks about are stored. Anything else in the payload
  // is discarded rather than persisted into a jsonb column nobody validates later.
  const answers: Record<string, string> = {}
  for (const [k, v] of Object.entries(args.answers)) {
    if (allowed.has(k) && typeof v === 'string') answers[k] = v.slice(0, 5000)
  }

  if (args.submit) {
    const missing = questions
      .filter((q) => q.required && !answers[q.key]?.trim())
      .map((q) => q.label)
    if (missing.length) {
      return { ok: false, error: `Still needed: ${missing.join(', ')}` }
    }
  }

  const { error } = await supabase
    .from('intakes')
    .update({
      answers,
      status: args.submit ? 'submitted' : 'started',
      ...(args.submit ? { submitted_at: new Date().toISOString() } : {}),
    })
    .eq('id', intake.id)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: 'client (intake link)',
    action: args.submit ? 'intake.submitted' : 'intake.saved',
    entity: 'intakes',
    entity_id: intake.id,
    meta: { org_id: intake.org_id, answered: Object.keys(answers).length },
  })

  revalidatePath(`/intake/${args.token}`)
  revalidatePath(`/outreach/${intake.org_id}`)
  return { ok: true }
}
