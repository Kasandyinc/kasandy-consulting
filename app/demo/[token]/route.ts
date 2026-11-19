import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { injectFrame, packageNotFoundHtml } from '@/lib/engine/package-frame'

export const dynamic = 'force-dynamic'

/**
 * The tailored demo, as the prospect opens it.
 *
 * Reached from a cold email with no account, so the token is the credential — 24
 * random bytes, matched the same way the intake and proposal links are. The file
 * itself lives in a private bucket and is streamed through here rather than linked,
 * so the storage path is never exposed and access cannot outlive the token.
 *
 * The opening is recorded on the way past. That is the fact O-09 was written
 * against: "did they look" is the difference between a cold call and a warm one.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{32,64}$/i.test(params.token)) {
    return notFound()
  }

  const db = createAdminClient()

  const { data: org } = await db
    .from('orgs')
    .select('id, name, demo_object')
    .eq('package_token', params.token)
    .maybeSingle()

  if (!org?.demo_object) return notFound()

  const { data: file, error } = await db.storage.from('org-packages').download(org.demo_object)
  if (error || !file) {
    console.error('[demo] could not read the package:', error?.message)
    return notFound()
  }

  const html = await file.text()

  const { data: settings } = await db
    .from('settings')
    .select('booking_url, signature_email')
    .maybeSingle()

  // Best-effort: a logging failure must never stop the prospect seeing the demo.
  try {
    await db.from('demo_views').insert({
      org_id: org.id,
      kind: 'demo',
      ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
      user_agent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
    })
  } catch (err) {
    console.error('[demo] view not recorded:', err)
  }

  const framed = injectFrame(html, {
    orgName: org.name,
    bookingUrl: settings?.booking_url,
    contactEmail: settings?.signature_email,
  })

  return new NextResponse(framed, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Never cached by a shared cache: one token, one organisation's material.
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      // The demos are self-contained but load webfonts; allow that and nothing else
      // that could reach back out with what is on the page.
      'referrer-policy': 'no-referrer',
    },
  })
}

/**
 * A wrong or retired token gets a plain, human page — not a stack trace, and not a
 * hint that some other token would have worked. Shared with the PDF route.
 */
function notFound() {
  return new NextResponse(packageNotFoundHtml(), {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
