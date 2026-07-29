import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { IntakeQuestion } from '@/lib/engine/delivery'
import IntakeForm from './IntakeForm'

export const dynamic = 'force-dynamic'

/**
 * The intake questionnaire, opened with a token rather than an account.
 *
 * It reads through the admin client because the visitor has no session and RLS is
 * operator-only. The token is the whole authorisation, so the lookup is by token and
 * nothing else — there is no path here that takes an id from the URL and trusts it.
 */
export default async function IntakePage({ params }: { params: { token: string } }) {
  // Cheap shape check before touching the database, so a scan of random paths costs
  // nothing and never reaches a query.
  if (!/^[0-9a-f]{32,64}$/i.test(params.token)) notFound()

  const supabase = createAdminClient()
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, status, answers, submitted_at, org_id, form_id')
    .eq('token', params.token)
    .maybeSingle()

  if (!intake) notFound()

  const [{ data: form }, { data: org }] = await Promise.all([
    intake.form_id
      ? supabase.from('intake_forms').select('name, questions').eq('id', intake.form_id).maybeSingle()
      : supabase.from('intake_forms').select('name, questions').eq('slug', 'discovery-intake').maybeSingle(),
    supabase.from('orgs').select('name').eq('id', intake.org_id).maybeSingle(),
  ])

  const questions = ((form?.questions ?? []) as IntakeQuestion[])
    .slice()
    .sort((a, b) => a.order - b.order)

  if (intake.submitted_at) {
    return (
      <div className="card">
        <div className="card-b" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <h1 className="h1" style={{ fontSize: 22 }}>Thank you.</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Your answers reached us on {new Date(intake.submitted_at).toLocaleDateString('en-CA')}.
            Jackee will be in touch before your discovery session.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="eyebrow">Discovery</div>
      <h1 className="h1">{form?.name ?? 'Intake'}</h1>
      <p className="lede">
        {org?.name ? `A few questions about ${org.name} ` : 'A few questions '}
        before we meet. Answer what you can — anything you are unsure about is fine to
        leave blank, and we will cover it on the call.
      </p>

      <IntakeForm
        token={params.token}
        questions={questions}
        initialAnswers={(intake.answers ?? {}) as Record<string, string>}
      />
    </>
  )
}
