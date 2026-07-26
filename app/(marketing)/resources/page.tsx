export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'
import { articles } from '@/data/articles'
import LeadMagnetCard from './LeadMagnetCard'
import PaidProductCard from './PaidProductCard'
import NewsletterSignup from './NewsletterSignup'
import { kvGet, KEYS } from '@/lib/kv'
import type { Download } from '@/types/downloads'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

export const metadata: Metadata = {
  title: 'Free Resources, Guides & Digital Products',
  description: 'Free procurement checklists, business model canvases, province registration guides, and more. Built from real work with 3,000+ entrepreneurs and non-profits.',
  openGraph: { images: [{ url: '/images/hero-resources.jpg', width: 1200, height: 630 }] },
}

const categoryColors: Record<string, string> = {
  Procurement: 'bg-kc-brown/10 text-kc-brown',
  'Non-Profit Leadership': 'bg-kc-black/10 text-kc-black',
  'Non-Profit': 'bg-kc-black/10 text-kc-black',
  International: 'bg-kc-gray-border text-kc-gray-mid',
  Advocacy: 'bg-kc-red/10 text-kc-red',
  Entrepreneurs: 'bg-kc-brown/10 text-kc-brown',
}

export default async function Resources() {
  // Fetch downloads from KV (merged with defaults)
  const kvData = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
  // Always merge with defaults so new products appear even before first admin save
  const kvMap = new Map(kvData.map(d => [d.id, d]))
  const downloads: Download[] = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)

  const freeDownloads = downloads.filter(d => d.isFree)
  const paidProducts = downloads.filter(d => !d.isFree)

  const publishedArticles = articles.filter(a => a.published)
  const draftArticles = articles.filter(a => !a.published)
  const displayArticles = publishedArticles.length > 0 ? publishedArticles : draftArticles

  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-mist" style={{ minHeight: '70vh' }}>
        {/* R watermark */}
        <span className="absolute font-display font-bold text-kc-brown/[0.04] select-none pointer-events-none"
          style={{ fontSize: '520px', right: '-30px', top: '-80px', lineHeight: 1 }}>R</span>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-20 py-24 grid md:grid-cols-2 gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Resources</span>
            </div>
            <h1 className="font-display font-bold text-kc-charcoal leading-[1.08] mb-5 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(40px,4.5vw,64px)' }}>
              Knowledge that<br />moves you forward.
            </h1>
            <p className="font-sans text-[16px] leading-[1.74] text-kc-text-mid max-w-[440px] mb-9">
              Practical guides, tools, and workbooks for entrepreneurs, non-profits, and international businesses. Built from the work.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="#free-downloads" className="btn-brown">Free Downloads</Link>
              <Link href="#digital-products" className="btn-outline">Digital Products</Link>
            </div>
          </div>

          {/* Right: product preview grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
            {[
              { tag: 'Free', title: 'Canadian Procurement Readiness Checklist', href: '#free-downloads' },
              { tag: '$12', title: 'Business Model Canvas — Business Edition', href: '#digital-products' },
              { tag: '$15', title: 'Capability Statement Template Kit', href: '#digital-products' },
              { tag: '$19', title: 'RFP Response Starter Kit', href: '#digital-products' },
              { tag: '$17', title: 'Canadian Business Registration Guide by Province', href: '#digital-products' },
              { tag: '$27', title: 'Grant Writing Starter Pack', href: '#digital-products' },
            ].map((c, i) => (
              <Link key={i} href={c.href} className="group bg-kc-charcoal px-6 py-7 hover:bg-kc-brown transition-colors block">
                <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#555] mb-2.5">{c.tag}</div>
                <div className="font-sans text-[13px] font-semibold text-white leading-[1.45]">{c.title}</div>
                <div className="font-mono text-[10px] text-kc-brown/60 mt-3.5 tracking-[0.1em] group-hover:text-white/60 transition-colors">
                  {c.tag === 'Free' ? 'Download →' : 'Buy →'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free Downloads ── */}
      <section id="free-downloads" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Free Downloads</span>
          <h2 className="section-heading mb-4">Free Guides & Toolkits</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-14 max-w-xl">Enter your email to download instantly. You&apos;ll receive the guide directly to your inbox.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {freeDownloads.map(dl => (
              <LeadMagnetCard
                key={dl.id}
                id={dl.slug}
                title={dl.title}
                description={dl.description}
                format={dl.format}
                category={dl.category}
                downloadUrl={dl.enabled && dl.filename ? `/downloads/${dl.filename}` : null}
                comingSoon={!dl.enabled || !dl.filename}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Digital Products (Paid) ── */}
      <section id="digital-products" className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Digital Products</span>
          <h2 className="section-heading mb-4">AI-Powered Workbooks & Toolkits</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-14 max-w-xl">
            Answer a set of questions about your business or organisation — get a personalised, professional output in minutes. Download as PDF directly from the tool.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paidProducts.map(dl => (
              <PaidProductCard
                key={dl.id}
                id={dl.slug}
                title={dl.title}
                description={dl.description}
                format={dl.format}
                category={dl.category}
                price={dl.price}
                squareUrl={dl.enabled ? dl.squareUrl : ''}
                enabled={dl.enabled}
                comingSoon={!dl.enabled || (!dl.filename && !dl.squareUrl)}
              />
            ))}
          </div>
          <p className="font-sans text-xs text-kc-gray-mid mt-10 max-w-lg">
            All products open in your browser. AI workbooks include a built-in PDF download button. Static guides use <strong>File → Print → Save as PDF</strong>.
          </p>
        </div>
      </section>

      {/* ── Blog / Insights ── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Insights</span>
          <h2 className="section-heading mb-4">The Kasandy Brief</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-14 max-w-xl">Straight-talk on procurement, supplier diversity, non-profit leadership, and entrepreneurship. No filler.</p>
          {publishedArticles.length === 0 && (
            <div className="mb-8 border border-dashed border-kc-gray-border bg-white px-6 py-4 inline-flex items-center gap-3">
              <span className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid">Articles coming soon — publishing via Admin</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {displayArticles.map(a => (
              <div key={a.id} className="card group">
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-sans text-[10px] tracking-widest uppercase px-2 py-1 ${categoryColors[a.category] || 'bg-kc-gray-light text-kc-gray-mid'}`}>
                    {a.category}
                  </span>
                  {!a.published && (
                    <span className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid">Draft</span>
                  )}
                </div>
                <h3 className="font-display text-xl font-light leading-snug mb-3 group-hover:text-kc-brown transition-colors">{a.title}</h3>
                <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-6">{a.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] text-kc-gray-mid">{new Date(a.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {a.published ? (
                    <Link href={`/resources/articles/${a.slug}`} className="font-sans text-xs tracking-wide text-kc-brown group-hover:underline">Read More →</Link>
                  ) : (
                    <span className="font-sans text-xs text-kc-gray-mid">Coming Soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="section-label text-kc-brown">Newsletter</span>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-6">The Kasandy Brief</h2>
            <p className="font-sans text-sm text-white/60 leading-relaxed">
              Procurement strategy, supplier diversity insights, and honest counsel on entrepreneurship and leadership. Sent when there&apos;s something worth saying.
            </p>
          </div>
          <div>
            <NewsletterSignup />
          </div>
        </div>
      </section>

    </div>
  )
}
