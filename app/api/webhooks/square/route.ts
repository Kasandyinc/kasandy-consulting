import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createDownloadToken, updateTokenEmail } from '@/lib/tokens'
import { kv } from '@vercel/kv'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

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

      // Send purchase confirmation email
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const product = DEFAULT_DOWNLOADS.find(d => d.slug === productSlug)
        const productTitle = product?.title ?? productSlug
        const isAIWizard = product?.format?.includes('AI-powered') ?? false
        const expiryDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

        await resend.emails.send({
          from: 'Kasandy Consulting <consulting@kasandy.com>',
          to: buyerEmail,
          subject: `Your download is ready — ${productTitle}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1e1e1e;padding:24px 32px;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:0.04em;">
            K<span style="color:#712f1e;">A</span>SANDY <span style="color:rgba(255,255,255,0.4);font-weight:300;">CONSULTING</span>
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.18em;text-transform:uppercase;">
            Purchase Confirmed
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px 24px;">
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1e1e1e;line-height:1.1;">
            Your download is ready.
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#666;line-height:1.6;">
            Thank you for your purchase. Your personal access link is below — it's valid for 7 days and up to 10 uses.
          </p>

          <!-- Product box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border:1px solid #EDE5D8;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:10px;color:#712f1e;letter-spacing:0.18em;text-transform:uppercase;font-family:monospace;">Your Purchase</p>
              <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;font-weight:700;color:#1e1e1e;">${productTitle}</p>
              <a href="${downloadUrl}" style="display:inline-block;background:#712f1e;color:#fff;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">
                ${isAIWizard ? 'Open Workbook →' : 'Open Download →'}
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
            ${isAIWizard
              ? 'Opens in your browser. Answer the questions to generate your personalised output, then use the built-in PDF download button.'
              : 'Opens in your browser. Use File → Print → Save as PDF to save a copy.'
            }
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.6;">
            This link expires <strong style="color:#1e1e1e;">${expiryDate}</strong>. Keep this email for your records.
          </p>

          <hr style="border:none;border-top:1px solid #EDE5D8;margin:24px 0;">

          <p style="margin:0 0 4px;font-size:13px;color:#666;line-height:1.6;">
            Questions? Reply to this email or visit <a href="https://kasandyconsulting.com/contact" style="color:#712f1e;">kasandyconsulting.com/contact</a>.
          </p>
          <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
            Ready to go further? <a href="https://kasandyconsulting.com/contact" style="color:#712f1e;">Book a Strategy Session</a> with Jackee Kasandy.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e1e1e;padding:20px 32px;">
          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.35);line-height:1.7;letter-spacing:0.06em;">
            © 2026 KASANDY CONSULTING INC. · KASANDYCONSULTING.COM · VANCOUVER, BC, CANADA<br>
            PERSONAL USE LICENCE — REDISTRIBUTION OR RESALE PROHIBITED<br>
            <a href="https://kasandyconsulting.com/terms" style="color:rgba(255,255,255,0.35);">Terms &amp; Conditions</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
        console.log(`[webhook] Purchase email sent to ${buyerEmail}`)
      } catch (emailErr) {
        // Email failure is non-fatal — token is already created
        console.error('[webhook] Failed to send purchase email:', emailErr)
      }

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
