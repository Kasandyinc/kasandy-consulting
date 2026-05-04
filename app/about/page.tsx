import type { Metadata } from 'next'
import Link from 'next/link'
import { kv } from '@vercel/kv'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'About Kasandy Consulting | Jackee Kasandy, Procurement Strategist & Business Coach',
  description: "Meet Jackee Kasandy — founder of BEBC Society, BC Housing Commissioner, and creator of Canada's first supplier-focused procurement readiness course. Black women-owned consulting firm, Vancouver BC.",
  openGraph: { images: [{ url: '/images/hero-about.jpg', width: 1200, height: 630 }] },
}

type AboutContent = {
  credentials: { label: string; value: string }[]
  firmBio: string[]
  jBio: string[]
}

const hardcodedCredentials = [
  { label: 'Experience', value: '25+ years: corporate marketing, entrepreneurship, consulting' },
  { label: 'Corporate', value: 'Cossette | Bensimon Byrne | DDB Canada | BC Ferries | WorkSafeBC' },
  { label: 'Entrepreneurship', value: 'Founder & CEO, Kasandy Inc. (est. 2014) | Granville Island, Vancouver' },
  { label: 'Non-Profit', value: 'Founder & Global President, BEBC Society (est. 2020)' },
  { label: 'Boards', value: 'BC Housing Board Commissioner | Board of Directors, Union Gospel Mission' },
  { label: 'Recognition', value: '"23 Black Leaders in Vancouver" — Vancouver Economic Commission' },
  { label: 'Media', value: 'Montecristo Magazine' },
  { label: 'Programs', value: "Canada's First National Procurement Readiness Course" },
  { label: 'Impact', value: '3,000+ entrepreneurs trained | 17–21 businesses into procurement pipelines' },
  { label: 'Funded by', value: 'ISED Canada | SBCCI | FFBC' },
  { label: 'Partners', value: "Shared Services Canada | Procurement Assistance Canada | Women's Economic Council" },
]

const hardcodedFirmBio = [
  'Kasandy Consulting is a Black woman-owned consulting and advisory firm based in Vancouver, BC. We work with entrepreneurs, governments, non-profits, and international businesses who are serious about growth — the kind that lasts.',
  'We specialise in procurement strategy and supplier diversity, full-service business coaching, non-profit transformation, and international market entry. What connects all of it is a single belief: access to systems, knowledge, and networks should not depend on who you know or where you started.',
  'Our clients range from solo founders preparing their first government bid to federal agencies designing supplier diversity programs. The work is different. The standard is the same — clear strategy, honest counsel, and measurable results.',
]

const hardcodedJBio = [
  'Jackee Kasandy has spent over two decades at the intersection of marketing, entrepreneurship, and systemic change.',
  "Her career began in some of Canada's leading advertising agencies — Cossette Communications, Bensimon Byrne, DDB Canada — where she managed accounts for McDonald's, Loblaw Brands, BC Ferries, Heinz Canada, and others. She developed deep expertise in integrated campaign strategy, consumer research, and brand positioning across TV, radio, print, and digital.",
  'She moved into corporate marketing, serving as Manager of Corporate and Vacations Marketing at BC Ferries and Manager of Marketing and WorkSafeBC Experience at WorkSafeBC — leading large-scale, multi-year initiatives and learning what it takes to build brands and move people to action at an institutional level.',
  'In 2014, she made the leap into entrepreneurship. She founded Kasandy Inc. — a thriving lifestyle brand with a flagship brick-and-mortar retail store at historic Granville Island in Vancouver, BC. A 7-figure business built from the ground up.',
  "But it was her growing frustration with who gets access to corporate and government contracts that sparked her most significant work. In 2020, she founded the Black Entrepreneurs & Businesses of Canada Society (BEBC Society) — and designed Canada's first supplier-focused procurement and certification readiness course. That program has now supported over 3,000 participants nationally, helping underrepresented founders and newcomer entrepreneurs navigate and win government and corporate contracts. Seventeen to twenty-one of those businesses have reported securing procurement contracts, some at multi-million-dollar scale.",
  'Today, Jackee serves as a BC Housing Board Commissioner, appointed by Minister Ravi Kahlon. She sits on the Board of Directors at Union Gospel Mission in Vancouver. She leads Kasandy Consulting as Principal Consultant — working with clients across Canada and internationally.',
  'She was recognised by the Vancouver Economic Commission as one of the "23 Black Leaders in Vancouver" and featured in Montecristo Magazine. She is a keynote speaker, a relentless advocate for equity in procurement, and a mentor to hundreds of entrepreneurs and leaders across North America.',
]

const values = [
  {
    title: 'Access Is Earned Through Knowledge',
    body: 'The procurement system is complex by design. We believe every business deserves to understand it — and compete in it on equal footing. Complexity is not a barrier we accept.',
  },
  {
    title: 'Honest Counsel Over Comfortable Advice',
    body: "We tell clients what they need to hear, not what they want to hear. That sometimes means difficult conversations. The goal is results, not a long engagement.",
  },
  {
    title: 'Equity Is Structural, Not Performative',
    body: 'Supplier diversity and inclusive procurement are economic strategies, not optics. We help clients build the systems and habits that make equity real — not just visible.',
  },
  {
    title: 'Community Is Strategy',
    body: 'Our deep roots in entrepreneur ecosystems and equity-deserving networks are not just values. They are competitive advantages for every client we work with.',
  },
]

export default async function About() {
  const aboutContent = await kv.get<AboutContent>('about:content')

  const credentials =
    aboutContent?.credentials && aboutContent.credentials.length > 0
      ? aboutContent.credentials
      : hardcodedCredentials

  const firmBioParagraphs =
    aboutContent?.firmBio && aboutContent.firmBio.length > 0
      ? aboutContent.firmBio
      : hardcodedFirmBio

  const jBioParagraphs =
    aboutContent?.jBio && aboutContent.jBio.length > 0
      ? aboutContent.jBio
      : hardcodedJBio

  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-end overflow-hidden" style={{ minHeight: '86vh' }}>
        {/* Full-bleed photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-about.jpg" alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
          style={{ filter: 'sepia(15%) brightness(0.9)' }} />
        {/* Warm-white fade from bottom */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,rgba(253,252,250,.05) 0%,rgba(253,252,250,.3) 40%,rgba(253,252,250,.96) 100%)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-20 pb-16">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">About Kasandy Consulting</span>
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.04] mb-5 tracking-[-0.01em] max-w-4xl"
            style={{ fontSize: 'clamp(48px,5.5vw,76px)' }}>
            A firm built on proof,<br />
            <em className="italic text-kc-brown">not promises.</em>
          </h1>

          <p className="font-sans text-[18px] leading-[1.68] text-kc-text-mid max-w-[580px] mb-11">
            Twenty-five years of corporate marketing, entrepreneurship, and systemic change — distilled into strategy you can use.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/about#jackee" className="btn-brown">Read Jackee's Story</Link>
            <Link href="/contact" className="btn-outline">Book a Call</Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-0 border-t border-kc-linen pt-9">
            {[
              { val: '25', sup: '+', label: 'Years Experience' },
              { val: '3,000', sup: '+', label: 'Entrepreneurs Trained' },
              { val: "Canada's\nFirst", sup: '', label: 'Procurement Readiness Course', red: true },
              { val: '380', sup: '+', label: 'National Media Mentions' },
            ].map((s, i) => (
              <div key={i} className={`pr-10 mr-10 ${i < 3 ? 'border-r border-kc-linen' : ''}`}>
                <span className={`font-display font-bold leading-none block ${s.red ? 'text-kc-brown text-[26px]' : 'text-kc-charcoal'}`}
                  style={!s.red ? { fontSize: '42px' } : {}}>
                  {s.val.split('\n').map((line, j) => <span key={j}>{line}{j < s.val.split('\n').length - 1 && <br />}</span>)}
                  {s.sup && <span className="text-kc-brown" style={{ fontSize: '0.5em' }}>{s.sup}</span>}
                </span>
                <div className="font-mono text-[11px] text-kc-text-lt tracking-[0.1em] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Firm */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <span className="section-label">About the Firm</span>
            <h2 className="section-heading mb-8">Kasandy Consulting</h2>
            <div className="space-y-5 font-sans text-sm text-kc-gray-mid leading-relaxed">
              {firmBioParagraphs.map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
            </div>
          </div>
          <div className="border-l border-kc-gray-border pl-10 hidden md:block">
            <p className="font-display text-5xl text-kc-brown font-light mb-2">25+</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase mb-8">Years of experience</p>
            <p className="font-display text-5xl text-kc-brown font-light mb-2">3,000+</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase mb-8">Entrepreneurs trained</p>
            <p className="font-display text-5xl text-kc-brown font-light mb-2">17–21</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase">Businesses into procurement pipelines</p>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section id="jackee" className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <span className="section-label">Meet Jackee Kasandy</span>
            <h2 className="section-heading mb-2">Founder & Principal Consultant</h2>
            <p className="font-display text-xl italic text-kc-gray-mid mb-10">Her Story</p>

            <div className="space-y-5 font-sans text-sm text-kc-gray-mid leading-relaxed">
              {jBioParagraphs.map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
            </div>
          </div>

          {/* Credentials Sidebar */}
          <div>
            <div className="bg-white border border-kc-gray-border p-8 sticky top-24">
              <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-6">Credentials</p>
              <div className="space-y-5">
                {credentials.map((c) => (
                  <div key={c.label}>
                    <p className="font-sans text-[10px] tracking-wider uppercase text-kc-gray-mid mb-1">{c.label}</p>
                    <p className="font-sans text-xs text-kc-black leading-relaxed">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Our Values</span>
          <h2 className="section-heading mb-16">What We Stand For</h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {values.map((v) => (
              <div key={v.title}>
                <div className="w-8 h-0.5 bg-kc-brown mb-4" />
                <h3 className="font-display text-2xl font-light mb-3">{v.title}</h3>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Recognition & Media</span>
          <h2 className="section-heading mb-12">Recognition & Media</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                label: '"23 Black Leaders in Vancouver" — Vancouver Economic Commission',
                href: 'https://vancouvereconomic.com/news/announcing-the-23-black-leaders-in-vancouver/',
              },
              {
                label: 'Featured in Montecristo Magazine',
                href: 'https://montecristomagazine.com',
              },
              {
                label: 'BC Housing Board Commissioner — Appointed by Minister Ravi Kahlon, Province of BC',
                href: 'https://www.bchousing.org/about/board-of-commissioners',
              },
              {
                label: 'Funded initiatives: Innovation, Science & Economic Development Canada | SBCCI | FFBC',
                href: 'https://ised-isde.canada.ca/site/ised/en',
              },
              {
                label: "Partners: Shared Services Canada | Procurement Assistance Canada | Women's Economic Council",
                href: 'https://buyandsell.gc.ca/procurement-assistance-canada',
              },
              {
                label: 'Board: Union Gospel Mission, Vancouver',
                href: 'https://www.ugm.ca',
              },
            ].map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 border border-kc-gray-border bg-white p-5 hover:border-kc-brown transition-colors group">
                <span className="text-kc-brown mt-0.5 shrink-0">—</span>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed group-hover:text-kc-brown transition-colors">{item.label}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-kc-black text-white">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-4xl font-light text-white mb-5">Want to know if we're the right fit?</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-10">
            Book a complimentary 15-minute strategy call. No pitch, no pressure — just an honest conversation about what you're building and how we might help.
          </p>
          <Link href="/contact" className="btn-brown">Book a Strategy Call</Link>
        </div>
      </section>

    </div>
  )
}
