import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'
import ImportPanel from './ImportPanel'

export const dynamic = 'force-dynamic'
// The import makes one round-trip per record, so give the function room. The action
// stops itself at 45s and reports what is left rather than being killed mid-write.
export const maxDuration = 60

export default async function ImportPage() {
  const supabase = createClient()

  const [{ count: submissions }, { count: subscribers }, { count: testimonials }, { count: posts }] =
    await Promise.all([
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }),
      supabase.from('testimonials').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
    ])

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">Import from the legacy CMS</h1>
        <p className="lede">
          Moves submissions, subscribers, testimonials, articles and tracking settings
          out of Vercel KV and into this platform. Nothing is deleted from KV, so the old
          <span className="mono"> /admin </span> keeps working exactly as it does now.
        </p>
      </div>

      <div className="grid g4" style={{ marginTop: 20 }}>
        <div className="stat">
          <div className="n">{submissions ?? 0}</div>
          <div className="l">Submissions here now</div>
        </div>
        <div className="stat g">
          <div className="n">{subscribers ?? 0}</div>
          <div className="l">Subscribers</div>
        </div>
        <div className="stat i">
          <div className="n">{testimonials ?? 0}</div>
          <div className="l">Testimonials</div>
        </div>
        <div className="stat p">
          <div className="n">{posts ?? 0}</div>
          <div className="l">Posts</div>
        </div>
      </div>

      <ImportPanel />

      <SystemStrip>
        Runs on Vercel, where the KV and Supabase credentials already live — nothing is
        copied to a laptop. Safe to run more than once: every record is matched before it
        is written, so a second run adds nothing and a run that times out can simply be
        started again.
      </SystemStrip>
    </>
  )
}
