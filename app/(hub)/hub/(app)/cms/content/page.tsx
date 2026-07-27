import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'
import ContentEditor from './ContentEditor'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">Blog &amp; whitepapers</h1>
        <p className="lede">
          Articles and gated whitepapers, each with its own SEO fields. A whitepaper
          marked gated sits behind the existing download flow.
        </p>
      </div>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>Could not read posts: {error.message}</div>
      )}

      <ContentEditor posts={(data ?? []) as never} />

      <SystemStrip>
        Only published pieces are readable by the public site; drafts have no anon
        policy at all, so an unfinished article cannot leak through the API.
      </SystemStrip>
    </>
  )
}
