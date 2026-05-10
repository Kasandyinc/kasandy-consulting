import { NextRequest, NextResponse } from 'next/server'
import { embedForensicMetadata } from '@/lib/embedForensicMetadata'
import { validateToken, FREE_SLUGS } from '@/lib/tokens'

// Allow up to 30s — PDF processing
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-kc-token') ?? ''
  const slug  = req.headers.get('x-kc-slug')  ?? 'product'

  // Validate token for paid products
  let buyerEmail = 'anonymous'
  if (!FREE_SLUGS.includes(slug) && token) {
    try {
      const validation = await validateToken(token, slug)
      if (validation.valid) {
        buyerEmail = validation.data.buyerEmail
      }
    } catch { /* allow through — forensic best-effort */ }
  }

  // Read PDF bytes from request body
  let pdfBytes: ArrayBuffer
  try {
    pdfBytes = await req.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Could not read PDF data' }, { status: 400 })
  }

  if (!pdfBytes || pdfBytes.byteLength === 0) {
    return NextResponse.json({ error: 'No PDF data received' }, { status: 400 })
  }

  try {
    const sessionId = 'KC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase()
    const generatedAt = new Date().toISOString()

    const watermarked = await embedForensicMetadata(pdfBytes, {
      sessionId,
      buyerEmail,
      productSlug: slug,
      generatedAt,
    })

    const filename = `kasandy-${slug}-${sessionId}.pdf`

    return new NextResponse(Buffer.from(watermarked), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-KC-Session': sessionId,
      },
    })
  } catch (err) {
    console.error('[/api/watermark-pdf]', err)
    return NextResponse.json({ error: 'PDF watermarking failed' }, { status: 500 })
  }
}
