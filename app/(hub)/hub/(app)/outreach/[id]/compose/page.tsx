import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkSend, type TemplateRow, type SettingsRow } from '@/lib/engine/send'
import type { Org, Contact, ConsentRow } from '@/lib/engine/types'
import { SystemStrip } from '../../../../../_components/ui'
import Composer from './Composer'

export const dynamic = 'force-dynamic'

export default async function ComposePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { template?: string; to?: string }
}) {
  const supabase = createClient()

  const [{ data: org }, { data: contacts }, { data: consent }, { data: templates }, { data: settings }] =
    await Promise.all([
      supabase.from('orgs').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('contacts').select('*').eq('org_id', params.id).order('name'),
      supabase.from('consent_ledger').select('*').eq('org_id', params.id),
      supabase.from('templates').select('*').eq('channel', 'email').eq('active', true).order('id'),
      supabase.from('settings').select('*').maybeSingle(),
    ])

  if (!org) notFound()

  const contactList = (contacts ?? []) as Contact[]
  const templateList = (templates ?? []) as TemplateRow[]
  const selectedTemplate =
    templateList.find((t) => t.id === searchParams.template) ?? templateList[0] ?? null
  const selectedContact =
    contactList.find((c) => c.id === searchParams.to) ??
    contactList.find((c) => c.email) ??
    null

  const check = checkSend({
    org: org as Org,
    contact: selectedContact,
    contacts: contactList,
    consent: (consent ?? []) as ConsentRow[],
    template: selectedTemplate,
    settings: (settings ?? null) as SettingsRow | null,
  })

  return (
    <>
      <Link href={`/outreach/${params.id}`} className="btn sm">
        ← {(org as Org).name}
      </Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Composer</div>
        <h1 className="h1">Send outreach</h1>
        <p className="lede">
          Preview is the exact email that would leave, footer included. Every send in
          Phase 1 waits for your click.
        </p>
      </div>

      <Composer
        orgId={params.id}
        orgName={(org as Org).name}
        contacts={contactList.map((c) => ({ id: c.id, name: c.name, email: c.email, title: c.title }))}
        templates={templateList.map((t) => ({ id: t.id, name: t.name, slug: t.slug, hasBody: Boolean(t.body_md?.trim()) }))}
        selectedTemplateId={selectedTemplate?.id ?? null}
        selectedContactId={selectedContact?.id ?? null}
        initialCheck={{ ready: check.ready, reasons: check.reasons, subject: check.subject, full: check.full }}
      />

      <SystemStrip>
        The database is the final authority: a send row is refused unless consent,
        route, template, mailing address, HOLD and sign-off all pass. Unattended sending
        stays off until a per-template toggle is flipped.
      </SystemStrip>
    </>
  )
}
