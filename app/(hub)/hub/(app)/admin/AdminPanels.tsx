'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveSettings, setOperator } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type Settings = {
  mailing_address: string | null
  sending_address: string | null
  phone: string | null
  timezone: string | null
  casl_footer_md: string | null
  signature_name: string | null
  signature_role: string | null
  signature_email: string | null
  signature_tagline: string | null
  signature_logo_url: string | null
  booking_url: string | null
}

type Operator = { email: string; role: string; added_at: string }
type EnvRow = { key: string; set: boolean; why: string }
type SpamRow = { control: string; active: boolean; note: string }

export default function AdminPanels({
  settings,
  operators,
  env,
  spam,
  auditRows,
}: {
  settings: Settings
  operators: Operator[]
  env: EnvRow[]
  spam: SpamRow[]
  auditRows: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [tab, setTab] = useState<'settings' | 'signature' | 'people' | 'environment'>('settings')

  const [s, setS] = useState({
    mailingAddress: settings.mailing_address ?? '',
    sendingAddress: settings.sending_address ?? '',
    phone: settings.phone ?? '',
    timezone: settings.timezone ?? 'America/Vancouver',
    caslFooterMd: settings.casl_footer_md ?? '',
    signatureName: settings.signature_name ?? '',
    signatureRole: settings.signature_role ?? '',
    signatureEmail: settings.signature_email ?? '',
    signatureTagline: settings.signature_tagline ?? '',
    signatureLogoUrl: settings.signature_logo_url ?? '',
    bookingUrl: settings.booking_url ?? '',
  })

  const [newOperator, setNewOperator] = useState('')

  const run = (fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? res.warning ?? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  const save = () => run(() => saveSettings(s), 'Saved.')
  const set = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS({ ...s, [k]: e.target.value })

  const missingEnv = env.filter((e) => !e.set)
  const inactiveSpam = spam.filter((c) => !c.active)

  return (
    <>
      {(missingEnv.length > 0 || inactiveSpam.length > 0) && (
        <div className="err" style={{ marginTop: 18 }}>
          <strong>This environment is incomplete.</strong>{' '}
          {missingEnv.length > 0 && `${missingEnv.length} variable${missingEnv.length === 1 ? '' : 's'} missing. `}
          {inactiveSpam.length > 0 && `${inactiveSpam.length} spam control${inactiveSpam.length === 1 ? '' : 's'} not running. `}
          See <button className="btn sm" onClick={() => setTab('environment')}>Environment</button>
        </div>
      )}

      <div className="tabs" style={{ marginTop: 20 }}>
        {(['settings', 'signature', 'people', 'environment'] as const).map((t) => (
          <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="card">
          <div className="card-h between">
            <h3>Platform settings</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              the send-gate reads these
            </span>
          </div>
          <div className="card-b">
            <Row
              label="Mailing address"
              hint="CASL requires a physical address in every commercial email. A send is refused without it."
            >
              <input value={s.mailingAddress} onChange={set('mailingAddress')} style={field} />
            </Row>
            <Row
              label="Sending address"
              hint='Must be on the domain verified in Resend. "Name <address>" is allowed.'
            >
              <input value={s.sendingAddress} onChange={set('sendingAddress')} style={field} />
            </Row>
            <div className="row wrap" style={{ gap: 12 }}>
              <div style={{ flex: '1 1 200px' }}>
                <Row label="Phone" hint="Used by the [Phone] token and the signature.">
                  <input value={s.phone} onChange={set('phone')} style={field} />
                </Row>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <Row label="Timezone" hint="Drives the daily cron and every date shown.">
                  <input value={s.timezone} onChange={set('timezone')} style={field} />
                </Row>
              </div>
            </div>
            <Row label="CASL footer" hint="Appended to every outreach email, above the unsubscribe link.">
              <textarea rows={3} value={s.caslFooterMd} onChange={set('caslFooterMd')} style={{ ...field, resize: 'vertical' }} />
            </Row>
            <button className="btn ox" disabled={pending} onClick={save}>
              {pending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

      {tab === 'signature' && (
        <div className="card">
          <div className="card-h between">
            <h3>Email signature</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              appended at send, to every email
            </span>
          </div>
          <div className="card-b">
            <div className="row wrap" style={{ gap: 12 }}>
              <div style={{ flex: '1 1 200px' }}>
                <Row label="Name"><input value={s.signatureName} onChange={set('signatureName')} style={field} /></Row>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <Row label="Role"><input value={s.signatureRole} onChange={set('signatureRole')} style={field} /></Row>
              </div>
            </div>
            <Row label="Email shown in the signature" hint="Where replies are invited, not where mail is sent from.">
              <input value={s.signatureEmail} onChange={set('signatureEmail')} style={field} />
            </Row>
            <Row label="Tagline">
              <textarea rows={2} value={s.signatureTagline} onChange={set('signatureTagline')} style={{ ...field, resize: 'vertical' }} />
            </Row>
            <div className="row wrap" style={{ gap: 12 }}>
              <div style={{ flex: '1 1 240px' }}>
                <Row label="Logo URL" hint="Must be publicly reachable, or it shows as a broken image.">
                  <input value={s.signatureLogoUrl} onChange={set('signatureLogoUrl')} style={field} />
                </Row>
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <Row label="Booking link"><input value={s.bookingUrl} onChange={set('bookingUrl')} style={field} /></Row>
              </div>
            </div>
            <button className="btn ox" disabled={pending} onClick={save}>
              {pending ? 'Saving…' : 'Save signature'}
            </button>
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div className="card">
          <div className="card-h between">
            <h3>Operators</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {operators.length} · what RLS trusts
            </span>
          </div>
          <div className="card-b">
            <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 14 }}>
              Two lists have to agree for someone to get in: this table, which the
              database trusts, and <span className="mono">ENGINE_OPERATOR_EMAILS</span> in
              Vercel, which the application checks. Adding someone here is half the job.
            </p>

            {operators.map((o) => (
              <div key={o.email} className="row between center" style={{ padding: '7px 0', gap: 10 }}>
                <div>
                  <span className="mono" style={{ fontSize: 12.5 }}>{o.email}</span>
                  <span className="tag" style={{ marginLeft: 8 }}>{o.role}</span>
                </div>
                <button
                  className="btn sm"
                  disabled={pending}
                  onClick={() => run(() => setOperator({ email: o.email, add: false }), 'Removed.')}
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <input
                placeholder="new.operator@kasandyconsulting.com"
                value={newOperator}
                onChange={(e) => setNewOperator(e.target.value)}
                style={{ ...field, flex: 1 }}
              />
              <button
                className="btn ox"
                disabled={pending || !newOperator.trim()}
                onClick={() =>
                  run(async () => {
                    const res = await setOperator({ email: newOperator, add: true })
                    if (res.ok) setNewOperator('')
                    return res
                  }, 'Added.')
                }
              >
                Add
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 14 }}>
              <div className="eyebrow">Who can do what</div>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Action</th><th>Operator</th><th>Client</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Read prospects, sends, consent', '✓', '—'],
                    ['Send outreach', '✓ one click each', '—'],
                    ['Grant Black-led sign-off', '✓ owner only', '—'],
                    ['Read own engagement and invoices', '✓', '✓'],
                    ['Mark a phase verified live', '✗ refused by the database', '✓ only them'],
                    ['Edit website forms and content', '✓', '—'],
                    ['Read the audit log', '✓', '✗ append only'],
                  ].map(([a, op, cl]) => (
                    <tr key={a}>
                      <td>{a}</td>
                      <td style={{ color: op.startsWith('✗') ? 'var(--bad)' : undefined }}>{op}</td>
                      <td style={{ color: 'var(--muted)' }}>{cl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'environment' && (
        <>
          <div className="card">
            <div className="card-h between">
              <h3>Environment</h3>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                presence only — no values shown
              </span>
            </div>
            <table>
              <thead>
                <tr><th>Variable</th><th>State</th><th>What depends on it</th></tr>
              </thead>
              <tbody>
                {env.map((e) => (
                  <tr key={e.key}>
                    <td className="mono" style={{ fontSize: 11.5 }}>{e.key}</td>
                    <td>
                      {e.set ? <span className="tag good">set</span> : <span className="tag bad">missing</span>}
                    </td>
                    <td style={{ fontSize: 12.5, color: e.set ? 'var(--muted)' : 'var(--bad)' }}>{e.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-h between">
              <h3>Spam controls</h3>
              <Link href="/cms/spam" className="btn sm">Details →</Link>
            </div>
            <table>
              <tbody>
                {spam.map((c) => (
                  <tr key={c.control}>
                    <td style={{ fontWeight: 600 }}>{c.control}</td>
                    <td>
                      {c.active ? <span className="tag good">running</span> : <span className="tag bad">not running</span>}
                    </td>
                    <td style={{ fontSize: 12.5, color: c.active ? 'var(--muted)' : 'var(--bad)' }}>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-b row between center">
              <span>
                <strong>{auditRows}</strong> entries in the audit log
              </span>
              <Link href="/audit" className="btn sm">Open the log →</Link>
            </div>
          </div>
        </>
      )}

      {flash && (
        <p style={{ marginTop: 14, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="eyebrow" style={{ display: 'block' }}>{label}</label>
      {children}
      {hint && (
        <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  )
}
