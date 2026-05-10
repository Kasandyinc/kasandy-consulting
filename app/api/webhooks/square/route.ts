import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createDownloadToken, updateTokenEmail } from '@/lib/tokens'
import { kv } from '@vercel/kv'

// Map Square line item names → product slugs
// Update this map if product names change in Square
const ITEM_NAME_TO_SLUG: Record<string, string> = {
  'Business Model Canvas — Business Edition': 'bmc-business',
  'Business Model Canvas — Non-Profit Edition': 'bmc-nonprofit',
  'Canadian Business Registration Guide by Province': 'province-registration-guide',
  'Solopreneur Business Audit Workbook': 'solopreneur-audit',
  'Strategic Planning Facilitation Kit': 'strategic-planning-kit',
  'Capability Statement Template Kit': 'capability-statement',
  'The Procurement Pitch Kit': 'procurement-pitch-kit',
  'The 90-Day Procurement Pipeline Builder': 'pipeline-builder',
  'Procurement Readiness Action Plan — 30-Day Workbook': 'procurement-action-plan',
  'RFP Response Starter Kit': 'rfp-response-kit',
  'The Grant Readiness Self-Assessment': 'grant-readiness-assessment',
  'The Impact Report Template Kit': 'impact-report-kit',
  'Grant Writing Starter Pack': 'grant-writing-starter-pack',
  'Non-Profit Funding Strategy Workbook': 'nonprofit-funding-workbook',
  'Africa–Canada Market Entry Roadmap': 'africa-canada-roadmap',
}

function verifySquareSignature(body: string, signature: string | null, webhookUrl: string): boolean {
  if (!signature) return false
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  if (!sigKey) return false
  const hmac = crypto.createHmac('sha256', sigKey)
  hmac.update(webhookUrl + body)
  const expected = hmac.digest('base64')
  // timingSafeEqual throws if buffers differ in length — guard before comparing
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-square-hmacsha256-signature')
  const webhookUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? 'https://kasandyconsulting.com/api/webhooks/square'

  // In production, verify the signature
  if (process.env.NODE_ENV === 'production') {
    if (!verifySquareSignature(body, signature, webhookUrl)) {
      console.error('[webhook] Invalid Square signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type as string

  // Handle payment completion
  if (eventType === 'payment.updated') {
    const paymentData = (event.data as Record<string, unknown>)?.object as Record<string, unknown>
    const payment = paymentData?.payment as Record<string, unknown>

    if (payment?.status !== 'COMPLETED') {
      return NextResponse.json({ received: true }) // ignore non-completed payments
    }

    const buyerEmail = (payment.buyer_email_address as string) ?? 'unknown@purchase.com'
    const orderId = payment.order_id as string
    // Note field set in Square checkout (set as product slug)
    const noteSlug = payment.note as string | undefined

    // Try to resolve product slug from note field first, then order ID lookup
    const productSlug = noteSlug && ITEM_NAME_TO_SLUG[noteSlug] ? ITEM_NAME_TO_SLUG[noteSlug] : (noteSlug ?? 'unknown')

    // If we have an existing token for this order, just update the email
    if (orderId) {
      const existingToken = await kv.get<string>(`order:${orderId}`)
      if (existingToken) {
        await updateTokenEmail(existingToken, buyerEmail)
        console.log(`[webhook] Updated email for order ${orderId} → ${buyerEmail}`)
        return NextResponse.json({ received: true })
      }
    }

    // Create a new token for this purchase
    try {
      const token = await createDownloadToken(productSlug, buyerEmail, orderId)
      const downloadUrl = `${process.env.NEXT_PUBLIC_URL ?? 'https://kasandyconsulting.com'}/api/serve/${productSlug}?token=${token}`

      console.log(`[webhook] Created token for ${buyerEmail} → ${productSlug}: ${token}`)

      // TODO: Send purchase confirmation email with downloadUrl
      // await sendPurchaseEmail({ to: buyerEmail, productSlug, downloadUrl })
      // Resend is already installed — wire up email when ready

      // Store for admin reference
      await kv.set(`purchase:${Date.now()}`, JSON.stringify({
        email: buyerEmail, productSlug, orderId, token, downloadUrl,
        createdAt: new Date().toISOString(),
      }), { ex: 30 * 24 * 3600 }) // keep 30 days

    } catch (err) {
      console.error('[webhook] Failed to create token:', err)
      return NextResponse.json({ error: 'Token creation failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
