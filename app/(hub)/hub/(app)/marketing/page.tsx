import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../_components/ui'
import { SEGMENTS, type Segment } from '@/lib/engine/campaigns'
import { segmentRecipients } from './actions'
import MarketingPanels from './MarketingPanels'

export const dynamic = 'force-dynamic'

/**
 * Marketing & Comms — newsletter, editorial board, LinkedIn planner, and the dates.
 *
 * Segment sizes are counted live on every load rather than stored. A saved audience
 * is a snapshot, and a snapshot keeps mailing the person who unsubscribed yesterday.
 */
export default async function MarketingPage() {
  const supabase = createClient()

  const [{ data: campaigns }, { data: posts }, { data: social }, { data: settings }] =
    await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select('id, title, slug, kind, stage, status, author, published_at').order('updated_at', { ascending: false }),
      supabase.from('social_posts').select('*').order('scheduled_for', { ascending: true, nullsFirst: false }),
      supabase.from('settings').select('mailing_address, sending_address').maybeSingle(),
    ])

  const counts: Record<string, number> = {}
  for (const s of SEGMENTS) {
    counts[s.id] = (await segmentRecipients(s.id as Segment)).length
  }

  return (
    <>
      <div className="eyebrow">Reach &amp; voice</div>
      <h1 className="h1">Marketing &amp; Comms</h1>
      <p className="lede">
        Newsletters, articles, and LinkedIn — audiences counted live from the platform,
        never from an exported list.
      </p>

      <MarketingPanels
        campaigns={(campaigns ?? []) as never}
        posts={(posts ?? []) as never}
        social={(social ?? []) as never}
        segments={SEGMENTS}
        counts={counts}
        ready={Boolean(settings?.mailing_address?.trim() && settings?.sending_address?.trim())}
      />

      <SystemStrip>
        A newsletter is a commercial electronic message like any other: the mailing
        address, the working unsubscribe and the suppression check all apply, and the
        send is refused without them. An opt-out anywhere suppresses everywhere — one
        list, not one per channel.
      </SystemStrip>
    </>
  )
}
