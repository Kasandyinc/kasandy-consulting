import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { packageNotFoundHtml } from '@/lib/engine/package-frame'

export const dynamic = 'force-dynamic'

/**
 * The PDF rendering of the same tailored demo, at the same token.
 *
 * demo_object (the HTML at /demo/<token>) stays the canonical, tracked artifact —
 * this exists because a prospect forwards a PDF to a board member or prints it for
 * a meeting, and until this route existed there was nothing to forward but the
 * live link itself.
 *
 * The PDF is generated once, outside the request path, with the same banner and
 * booking link injectFrame() burns into the HTML at serve time. That trade gives
 * up updating the booking link after the fact in exchange for never asking a
 * serverless function to run a headless browser on every open.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{32,64}$/i.test(params.token)) {
    return notFound()
  }

  const db = createAdminClient()

  const { data: org } = await db
    .from('orgs')
    .select('id, name, demo_pdf_object')
    .eq('package_token', params.token)
    .maybeSingle()

  if (!org?.demo_pdf_object) return notFound()

  const { data: file, error } = await db.storage.from('org-packages').download(org.demo_pdf_object)
  if (error || !file) {
    console.error('[demo/pdf] could not read the package:', error?.message)
    return notFound()
  }

  // Best-effort, exactly as the HTML route treats it: a logging failure must never
  // stop the prospect seeing the document.
  try {
    await db.from('demo_views').insert({
      org_id: org.id,
      kind: 'demo_pdf',
      ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
      user_agent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
    })
  } catch (err) {
    console.error('[demo/pdf] view not recorded:', err)
  }

  const bytes = await file.arrayBuffer()
  const filename = `${org.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}-demo.pdf`

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename}"`,
      // Never cached by a shared cache: one token, one organisation's material.
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'referrer-policy': 'no-referrer',
    },
  })
}

/**
 * A wrong or retired token gets a plain, human page — not a stack trace, and not a
 * hint that some other token would have worked. Shared with the HTML demo route.
 */
function notFound() {
  return new NextResponse(packageNotFoundHtml(), {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
