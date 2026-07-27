import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'
import SeoEditor from './SeoEditor'

export const dynamic = 'force-dynamic'

export default async function SeoPage() {
  const supabase = createClient()

  const [{ data: pages }, { data: settings }] = await Promise.all([
    supabase.from('page_meta').select('*').order('path'),
    supabase.from('site_settings').select('*').maybeSingle(),
  ])

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">SEO &amp; ad pixels</h1>
        <p className="lede">
          Per-page titles and descriptions for the marketing site, and the tracking IDs
          it loads. Pixels run on public pages only — the hub is tracker-free by rule,
          and nothing here can change that.
        </p>
      </div>

      <SeoEditor
        pages={(pages ?? []) as never}
        settings={
          (settings ?? {
            ga4_id: null,
            meta_pixel_id: null,
            linkedin_partner_id: null,
            pixels_enabled: true,
            default_og_image: null,
            contact_email: null,
          }) as never
        }
      />

      <SystemStrip>
        The hub&apos;s own root layout injects no analytics, no pixels and no external
        fonts, and reads none of these values. Changing a pixel ID here affects
        kasandyconsulting.com and nothing else.
      </SystemStrip>
    </>
  )
}
