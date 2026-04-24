import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kasandy Consulting | Where Ambition Meets Access',
  description: 'Procurement strategy, business coaching, non-profit transformation, and Canadian market entry programs. Led by Jackee Kasandy — creator of Canada\'s first procurement readiness course.',
}

const credibilityMarkers = [
  "Canada's First National Procurement Readiness Course",
  '3,000+ Entrepreneurs Trained',
  '17–21 Businesses Into Procurement Pipelines Including Multi-Million-Dollar Contracts',
  'BC Housing Board Commissioner',
  '"23 Black Leaders in Vancouver" — Vancouver Economic Commission',
  'Founder, Black Entrepreneurs & Businesses of Canada Society',
]

const audiences = [
  {
    number: '01',
    headline: 'Entrepreneurs & Founders',
    body: 'You have a strong business. Now you need the contracts, systems, and strategy to scale it.',
    cta: 'Business Coaching & Advisory',
    href: '/entrepreneurs',
  },
  {
    number: '02',
    headline: 'Government & Public Sector',
    body: 'Supplier diversity policy needs more than good intentions. We build the programs that actually deliver.',
    cta: 'Procurement Consulting',
    href: '/government',
  },
  {
    number: '03',
    headline: 'Non-Profit Organizations',
    body: 'Your mission is clear. Your sustainability model needs strengthening. We help you build both.',
    cta: 'Non-Profit Strategy',
    href: '/nonprofits',
  },
  {
    number: '04',
    headline: 'Kenya & International',
    body: "Canada's procurement market is a trillion-dollar opportunity. We'll show you how to compete in it.",
    cta: 'Market Entry Programs',
    href: '/kenya',
  },
]

const pillars = [
  {
    title: "We've Been Where You Are",
    body: 'Jackee built a 7-figure retail brand from the ground up, founded a national non-profit, and now advises federal boards. This isn\'t theory. Every strategy we give you has been tested in practice.',
  },
  {
    title: 'Institutional Credibility Meets Community Roots',
    body: 'We move fluently between government boardrooms and grassroots entrepreneur networks. That range is rare — and it\'s yours to leverage.',
  },
  {
    title: 'Equity Is the Strategy, Not the Footnote',
    body: "Our work is built around opening access to systems that weren't designed for everyone. That focus produces sharper strategy and better outcomes for every client we work with.",
  },
  {
    title: 'We Measure What Matters',
    body: 'Contracts won. Organisations stabilised. Markets entered. We track real outcomes — not workshop attendance or activity counts.',
  },
]

const stats = [
  { number: '3,000+', label: 'Entrepreneurs trained through national procurement programs' },
  { number: '17–21', label: 'Businesses that secured procurement contracts, including multi-million-dollar deals' },
  { number: '250+', label: 'Indigenous entrepreneurs trained through ISET partnership' },
  { number: "Canada's First", label: 'National supplier-focused procurement and certification readiness course' },
  { number: 'Funded by', label: 'Innovation, Science & Economic Development Canada | SBCCI | FFBC' },
  { number: 'Partners', label: 'Shared Services Canada | Procurement Assistance Canada | Women\'s Economic Council' },
]

export default function Home() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="min-h-[92vh] flex flex-col justify-center relative overflow-hidden px-6">
        <div className="absolute inset-0 bg-[url('/images/jackee-hero.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-kc-black/70" />
        <div className="relative max-w-7xl mx-auto w-full py-24">
          <p className="section-label text-kc-brown mb-6">Canada's Leading Procurement Strategist & Business Coach</p>
          <h1 className="font-display text-6xl md:text-8xl font-light text-white leading-[0.95] mb-8 text-balance">
            Where Ambition<br />Meets Access.
          </h1>
          <p className="font-sans text-lg md:text-xl text-white/80 max-w-2xl mb-12 leading-relaxed">
            We help entrepreneurs win contracts, governments build inclusive procurement systems, non-profits grow sustainably, and Kenyan businesses enter the Canadian market.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-brown">Work With Me</Link>
            <Link href="/services" className="btn-outline border-white text-white hover:bg-white hover:text-kc-black">Explore Our Services</Link>
          </div>
        </div>
      </section>

      {/* ── Credibility Bar ── */}
      <section className="bg-kc-gray-light border-y border-kc-gray-border overflow-hidden py-5">
        <div className="flex gap-12 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
          {[...credibilityMarkers, ...credibilityMarkers].map((m, i) => (
            <span key={i} className="font-sans text-xs tracking-wide text-kc-gray-mid shrink-0">
              <span className="text-kc-brown mr-3">—</span>{m}
            </span>
          ))}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Who We Work With</span>
          <h2 className="section-heading mb-16">Four audiences. One standard: real results.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {audiences.map((a) => (
              <Link key={a.href} href={a.href}
                className="group border border-kc-gray-border p-10 hover:border-kc-brown transition-all hover:shadow-sm">
                <p className="font-sans text-[11px] tracking-widest text-kc-brown mb-3">{a.number}</p>
                <h3 className="font-display text-3xl font-light mb-4 group-hover:text-kc-brown transition-colors">{a.headline}</h3>
                <p className="font-sans text-base text-kc-gray-mid leading-relaxed mb-6">{a.body}</p>
                <span className="font-sans text-sm tracking-wide text-kc-black flex items-center gap-2 group-hover:gap-3 transition-all">
                  {a.cta} <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Kasandy Difference ── */}
      <section className="py-24 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Why Kasandy Consulting</span>
          <h2 className="section-heading mb-4">There are a lot of consultants.</h2>
          <p className="font-display text-3xl font-light italic text-kc-gray-mid mb-16">Here's what makes this different.</p>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {pillars.map((p) => (
              <div key={p.title}>
                <div className="w-8 h-0.5 bg-kc-brown mb-4" />
                <h3 className="font-display text-2xl font-light mb-3">{p.title}</h3>
                <p className="font-sans text-base text-kc-gray-mid leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Speaking Image Strip ── */}
      <section className="grid grid-cols-3 h-64 md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/jackee-speaking-1.jpg" alt="Jackee Kasandy speaking" className="w-full h-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/jackee-workshop-1.jpg" alt="Jackee Kasandy workshop" className="w-full h-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/jackee-speaking-3.jpg" alt="Jackee Kasandy panel" className="w-full h-full object-cover" />
      </section>

      {/* ── Impact Numbers ── */}
      <section className="py-24 px-6 bg-kc-brown text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-white/60">Impact</span>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-16">The Numbers Speak.</h2>
          <div className="grid md:grid-cols-3 gap-x-12 gap-y-12">
            {stats.map((s) => (
              <div key={s.number} className="border-t border-white/20 pt-8">
                <p className="font-display text-4xl md:text-5xl font-light text-white mb-3">{s.number}</p>
                <p className="font-sans text-sm text-white/70 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Jackee Short ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="section-label">Meet Your Strategic Partner</span>
            <h2 className="section-heading mb-8">Jackee Kasandy</h2>
            <p className="font-sans text-base text-kc-gray-mid leading-relaxed mb-8">
              Jackee Kasandy has spent 25 years at the intersection of marketing, business, and systemic change. She designed Canada's first supplier-focused procurement readiness course, founded the Black Entrepreneurs & Businesses of Canada Society, and currently serves as a BC Housing Board Commissioner appointed by the provincial government. She built a 7-figure lifestyle brand on Granville Island. She knows exactly what it takes to get from idea to institution — and she will help you do the same.
            </p>
            <Link href="/about" className="btn-outline">Meet Jackee <ArrowRight size={13} className="ml-2" /></Link>
          </div>
          <div className="bg-kc-gray-light aspect-[4/5] flex items-center justify-center border border-kc-gray-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/jackee-portrait.jpg" alt="Jackee Kasandy"
              className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6 bg-kc-brown text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-light mb-5">Ready to get to work?</h2>
          <p className="font-sans text-sm text-white/80 leading-relaxed mb-10">
            Book a complimentary 15-minute strategy call. Tell us where you are and where you want to go. We'll tell you honestly how we can help — and what that looks like.
          </p>
          <Link href="/contact" className="inline-flex items-center px-10 py-4 bg-white text-kc-brown text-xs tracking-widest uppercase font-sans font-medium hover:bg-kc-black hover:text-white transition-colors">
            Book Your Strategy Call
          </Link>
        </div>
      </section>

    </div>
  )
}
