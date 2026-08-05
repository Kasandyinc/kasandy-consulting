import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * The tailored proposal, downloaded by the prospect.
 *
 * Same token as the demo, same private bucket, same recording — the proposal being
 * opened is a stronger signal than the demo being opened, and it is the one worth
 * ringing about.
 *
 * Served as an attachment with a filename the recipient will recognise months later
 * in their downloads folder, rather than a hex string.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{32,64}$/i.test(params.token)) return gone()

  const db = createAdminClient()

  const { data: org } = await db
    .from('orgs')
    .select('id, name, proposal_object')
    .eq('package_token', params.token)
    .maybeSingle()

  if (!org?.proposal_object) return gone()

  const { data: file, error } = await db.storage.from('org-packages').download(org.proposal_object)
  if (error || !file) {
    console.error('[proposal] could not read the package:', error?.message)
    return gone()
  }

  try {
    await db.from('demo_views').insert({
      org_id: org.id,
      kind: 'proposal',
      ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
      user_agent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
    })
  } catch (err) {
    console.error('[proposal] view not recorded:', err)
  }

  // A filename they will still understand in three months.
  const safe = org.name.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_') || 'Proposal'
  const filename = `Kasandy_Consulting_Proposal_${safe}.docx`

  return new NextResponse(await file.arrayBuffer(), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  })
}

function gone() {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">
<title>Not available — Kasandy Consulting</title>
<div style="font-family:Georgia,serif;max-width:520px;margin:12vh auto;padding:0 24px">
  <h1 style="font-size:24px;font-weight:400">This proposal isn&rsquo;t available.</h1>
  <p style="font-family:system-ui,sans-serif;font-size:14px;color:#555">Reply to the email it came from and we&rsquo;ll send a fresh link.</p>
</div>`,
    { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
