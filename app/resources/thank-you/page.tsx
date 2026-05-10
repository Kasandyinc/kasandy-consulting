import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowDownToLine, ArrowRight } from 'lucide-react'
import { kvGet, KEYS } from '@/lib/kv'
import type { Download } from '@/types/downloads'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thank You — Download Ready',
  description: 'Your purchase is confirmed. Your download is ready.',
  robots: { index: false, follow: false },
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: { product?: string }
}) {
  const { product } = searchParams

  // Merge KV overrides with defaults — same pattern as resources page
  const kvData = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
  const kvMap = new Map(kvData.map(d => [d.id, d]))
  const downloads: Download[] = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)

  const found = downloads.find(d => d.slug === product)

  const title = found?.title ?? 'Your Purchase'
  const filename = found?.filename ?? null
  const downloadUrl = filename ? `/downloads/${filename}` : null
  const isAIWizard = found?.format?.includes('AI-powered') ?? false
  const isKnownProduct = Boolean(found)

  return (
    <div className="pt-16 min-h-screen bg-kc-warm-white">
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-kc-brown/10 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-kc-brown" />
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-center gap-3 justify-center mb-5">
          <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Purchase Confirmed</span>
          <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
        </div>

        <h1 className="font-display font-bold text-kc-charcoal leading-[1.08] mb-4 tracking-[-0.01em]"
          style={{ fontSize: 'clamp(32px,4vw,52px)' }}>
          Thank you.<br />Your download is ready.
        </h1>

        <p className="font-sans text-[16px] leading-[1.7] text-kc-text-mid mb-10 max-w-md mx-auto">
          {isKnownProduct
            ? <>Your purchase of <strong className="text-kc-charcoal">{title}</strong> is confirmed. Click below to open your {isAIWizard ? 'workbook' : 'guide'}.</>
            : 'Your purchase is confirmed. Your download link will be sent to your email shortly.'
          }
        </p>

        {/* Download button */}
        {downloadUrl ? (
          <div className="space-y-4 mb-12">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-10 py-4 bg-kc-brown text-white font-sans text-xs tracking-widest uppercase font-medium hover:bg-kc-black transition-colors"
            >
              <ArrowDownToLine size={16} />
              Open {isAIWizard ? 'Workbook' : title}
            </a>
            <p className="font-sans text-xs text-kc-gray-mid">
              {isAIWizard
                ? 'Opens in a new tab — answer the questions to generate your personalised output, then use the built-in PDF download button.'
                : 'Opens in your browser — use File → Print → Save as PDF to save a copy'
              }
            </p>
          </div>
        ) : (
          <div className="bg-kc-gray-light border border-kc-gray-border p-8 mb-12 text-left max-w-md mx-auto">
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">
              Your download link has been sent to your email. If you don&apos;t see it within a few minutes, check your spam folder or{' '}
              <Link href="/contact" className="text-kc-brown underline">contact us</Link>.
            </p>
          </div>
        )}

        {/* Upsell / next steps */}
        <div className="border-t border-kc-gray-border pt-10 grid sm:grid-cols-2 gap-4 text-left">
          <Link href="/resources" className="group border border-kc-gray-border bg-white p-6 hover:border-kc-brown transition-colors block">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-2">More Resources</p>
            <h3 className="font-display text-lg font-light text-kc-black mb-2">Browse All Downloads</h3>
            <p className="font-sans text-xs text-kc-gray-mid leading-relaxed">Free guides, tools, and AI-powered workbooks for entrepreneurs and non-profits.</p>
            <p className="font-sans text-xs text-kc-brown mt-3 group-hover:underline flex items-center gap-1">Browse <ArrowRight size={11} /></p>
          </Link>
          <Link href="/contact" className="group border border-kc-gray-border bg-white p-6 hover:border-kc-brown transition-colors block">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-2">Ready to Go Further?</p>
            <h3 className="font-display text-lg font-light text-kc-black mb-2">Book a Strategy Call</h3>
            <p className="font-sans text-xs text-kc-gray-mid leading-relaxed">A 90-minute Discovery Session with Jackee Kasandy to build on what you&apos;ve just worked through.</p>
            <p className="font-sans text-xs text-kc-brown mt-3 group-hover:underline flex items-center gap-1">Book now <ArrowRight size={11} /></p>
          </Link>
        </div>

      </div>
    </div>
  )
}
