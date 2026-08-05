import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../_components/ui'
import CommsPanels from './CommsPanels'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  org_id: string | null
  contact_id: string | null
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string
  from_email: string | null
  to_email: string | null
  logged_by: string | null
  occurred_at: string
}

/**
 * Comms Hub — every message with a prospect or client, in one place.
 *
 * A thread is `sends` and `messages` read together. `sends` stays the record of
 * truth for outreach because the send-gate writes it; `messages` carries replies and
 * anything composed here. Keeping them separate means the outreach record cannot be
 * muddied by hub correspondence, and joining them at read time costs nothing.
 */
export default async function CommsPage() {
  const supabase = createClient()

  const [{ data: orgs }, { data: sends }, { data: messages }, { data: contacts }] =
    await Promise.all([
      supabase.from('orgs').select('id, name, stage, replied_at').order('name'),
      supabase
        .from('sends')
        .select('id, org_id, contact_id, subject, body_rendered, sent_at')
        .order('sent_at', { ascending: false })
        .limit(500),
      supabase
        .from('messages')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(500),
      supabase.from('contacts').select('id, org_id, name, email'),
    ])

  const msgRows = (messages ?? []) as Row[]

  // Outreach sends, cast into the same shape so a thread reads as one conversation.
  const sendRows: Row[] = ((sends ?? []) as never[]).map((s: never) => {
    const r = s as unknown as {
      id: string
      org_id: string
      contact_id: string | null
      subject: string | null
      body_rendered: string | null
      sent_at: string
    }
    return {
      id: `send:${r.id}`,
      org_id: r.org_id,
      contact_id: r.contact_id,
      direction: 'outbound' as const,
      subject: r.subject,
      body: r.body_rendered ?? '',
      from_email: null,
      to_email: null,
      logged_by: null,
      occurred_at: r.sent_at,
    }
  })

  const all = [...msgRows, ...sendRows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))

  return (
    <>
      <div className="eyebrow">One inbox</div>
      <h1 className="h1">Comms Hub</h1>
      <p className="lede">
        Every email with a prospect or client in one place — what went out, and what came
        back.
      </p>

      <CommsPanels
        orgs={(orgs ?? []) as never}
        contacts={(contacts ?? []) as never}
        messages={all as never}
        inboundConfigured={Boolean(process.env.INBOUND_EMAIL_SECRET)}
      />

      <SystemStrip>
        Recording a reply — however it arrives — sets the organisation&apos;s replied
        date, which halts the sequence and makes the send-gate refuse further outreach.
        That is a database rule, so it holds whether the reply came through the inbound
        route or was typed in here. Automated mail is stored but never counted as a
        reply: a bounce is not an answer, and treating it as one would silence a
        prospect forever.
      </SystemStrip>
    </>
  )
}
