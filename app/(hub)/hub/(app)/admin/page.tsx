import { createClient } from '@/lib/supabase/server'
import { spamControlStatus } from '@/lib/spam'
import { SystemStrip } from '../../../_components/ui'
import AdminPanels from './AdminPanels'

export const dynamic = 'force-dynamic'

/**
 * Admin — settings, operators, and what the environment actually provides.
 *
 * Every settings change before this page went through the Supabase SQL editor by
 * hand. The third panel exists because this session repeatedly lost time to
 * configuration that looked present and was not: a variable set but not deployed, a
 * key that verifies everything, a branch never merged.
 */
export default async function AdminPage() {
  const supabase = createClient()

  const [{ data: settings }, { data: operators }, { count: auditRows }] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('engine_operators').select('*').order('email'),
    supabase.from('audit_log').select('id', { count: 'exact', head: true }),
  ])

  // Configuration the platform depends on, and whether it is really there. Values are
  // never rendered — only whether each is present — so this page leaks no secrets.
  const env = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), why: 'Database and auth.' },
    { key: 'SUPABASE_SECRET_KEY', set: Boolean(process.env.SUPABASE_SECRET_KEY), why: 'Opt-out, crons, and the legacy import.' },
    { key: 'RESEND_API_KEY', set: Boolean(process.env.RESEND_API_KEY), why: 'Nothing can be emailed without it.' },
    { key: 'CRON_SECRET', set: Boolean(process.env.CRON_SECRET), why: 'Both crons return 401 without it.' },
    { key: 'KV_REST_API_URL', set: Boolean(process.env.KV_REST_API_URL), why: 'Rate limiting, and the legacy CMS store.' },
    { key: 'ENGINE_OPERATOR_EMAILS', set: Boolean(process.env.ENGINE_OPERATOR_EMAILS), why: 'The app-side operator allow-list.' },
    { key: 'NEXT_PUBLIC_HUB_URL', set: Boolean(process.env.NEXT_PUBLIC_HUB_URL), why: 'Links in proposals and portal emails.' },
    { key: 'TURNSTILE_SECRET_KEY', set: Boolean(process.env.TURNSTILE_SECRET_KEY), why: 'Without it every public form loses its bot check.' },
    { key: 'ADMIN_PASSWORD', set: Boolean(process.env.ADMIN_PASSWORD), why: 'The legacy /admin CMS. Retired once E7 finishes absorbing it.' },
    {
      key: 'ADMIN_SESSION_SECRET',
      set: Boolean(process.env.ADMIN_SESSION_SECRET),
      why: 'Signs the legacy /admin cookie. Falls back to ADMIN_PASSWORD if unset, so this is optional.',
    },
  ]

  return (
    <>
      <div className="eyebrow">System</div>
      <h1 className="h1">Admin</h1>
      <p className="lede">
        Platform settings, who can sign in, and whether this environment actually has
        what the platform needs.
      </p>

      <AdminPanels
        settings={
          (settings ?? {
            mailing_address: null,
            sending_address: null,
            phone: null,
            timezone: 'America/Vancouver',
            casl_footer_md: null,
            signature_name: null,
            signature_role: null,
            signature_email: null,
            signature_tagline: null,
            signature_logo_url: null,
            booking_url: null,
          }) as never
        }
        operators={(operators ?? []) as never}
        env={env}
        spam={spamControlStatus()}
        auditRows={auditRows ?? 0}
      />

      <SystemStrip>
        Every change here is recorded by a database trigger that stores the before and
        after of each field — the platform&apos;s own configuration is audited the same
        way a prospect record is. The log has no update or delete policy, so nothing
        written to it can be rewritten.
      </SystemStrip>
    </>
  )
}
