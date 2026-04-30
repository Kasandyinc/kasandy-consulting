import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Client Results & Case Studies',
  description: "Real results from real work. Explore Kasandy Consulting's case studies in procurement program design, Indigenous entrepreneur training, and non-profit transformation.",
  openGraph: { images: [{ url: '/images/hero-work.jpg', width: 1200, height: 630 }] },
}

const stats = [
  { value: '3,000+', label: 'Entrepreneurs trained nationally' },
  { value: '17–21', label: 'Businesses secured procurement contracts' },
  { value: '250+', label: 'Indigenous entrepreneurs trained through ISET partnership' },
  { value: "Canada's First", label: 'National supplier-focused procurement readiness course' },
  { value: 'Hundreds', label: 'Leaders, boards, and executives coached' },
  { value: 'Multi-sector', label: 'Federal, provincial, municipal, corporate, non-profit' },
]

const caseStudies = [
  {
    number: '01',
    label: 'Procurement Program Design & National Delivery',
    client: 'BEBC Society',
    tagline: "Designing and delivering Canada's first national procurement readiness program for underrepresented entrepreneurs.",
    challenge: "There was no nationally accessible, supplier-focused training that prepared underrepresented entrepreneurs — particularly Black and newcomer founders — to compete for and win Canadian government and corporate contracts. Most procurement training was buyer-facing, not supplier-facing.",
    approach: [
      "Designed Canada's first procurement readiness course from the ground up — curriculum, delivery format, and assessment framework",
      'Secured national partnerships with Shared Services Canada, Procurement Assistance Canada, ISED Canada, SBCCI, and FFBC',
      'Built and led a national delivery infrastructure reaching participants across every province',
      'Iterated the program based on participant outcomes and buyer feedback over multiple cohorts',
      'Added certification pathway support and 1:1 coaching for pipeline-ready participants',
    ],
    results: [
      '3,000+ entrepreneurs trained nationally',
      '17–21 businesses moved into active procurement pipelines',
      'Multiple participants secured multi-million-dollar contracts',
      'Program adopted as national model by BEBC Society',
      'Funding secured from ISED Canada, SBCCI, and FFBC',
    ],
  },
  {
    number: '02',
    label: 'Indigenous Procurement Training',
    client: 'ISET Partnership',
    tagline: 'Delivering culturally grounded procurement readiness training to Indigenous entrepreneurs across BC.',
    challenge: "Indigenous entrepreneurs face compounded barriers in procurement: limited access to certification resources, unfamiliarity with the federal procurement system, and training programs that were not designed with their context in mind.",
    approach: [
      'Partnered with ISET (Indigenous Skills and Employment Training) to reach Indigenous entrepreneur networks',
      'Adapted existing procurement readiness curriculum for Indigenous business context — terminology, structure, and examples',
      'Delivered workshops across multiple communities and urban settings in British Columbia',
      'Provided 1:1 coaching follow-up for participants progressing toward procurement submissions',
      'Developed supporting resources tailored to Indigenous-owned business certification requirements',
    ],
    results: [
      '250+ Indigenous entrepreneurs trained',
      'Participants supported in CPN (Canadian Procurement Network) certification preparation',
      'Multiple participants progressed to active procurement bids following training',
      'Program recognised as a model for culturally appropriate procurement training',
    ],
  },
  {
    number: '03',
    label: 'Non-Profit Transformation',
    client: 'Anonymised Client — Social Services Organisation, BC',
    tagline: 'A 6-month strategic transformation engagement that moved a mission-driven organisation from crisis to clarity.',
    challenge: "The organisation had strong community impact but had become structurally dependent on two funders for over 80% of its operating budget. Leadership was reactive rather than strategic, and the board lacked the governance structures needed to support growth. One funder had signalled a potential pull-back.",
    approach: [
      'Completed a full organisational diagnostic: financials, governance, programming, funder relationships, and leadership capacity',
      'Facilitated board governance training and restructured board roles and responsibilities',
      'Led a 3-day strategic planning retreat with leadership and board',
      'Developed a 3-year sustainability roadmap with diversified revenue targets and a earned income strategy',
      'Built a funder diversification plan with 12 new funder prospects identified and approached',
      'Coached executive director on leadership communication, stakeholder management, and board relations',
    ],
    results: [
      'Board restructured and governance framework implemented',
      'Strategic plan adopted with 3-year milestones',
      'Funder diversification plan in active execution',
      'Executive director reported significant improvement in board relationships and leadership confidence',
      'Organisation stabilised and no longer at acute funder risk at engagement close',
    ],
  },
]

const partners = [
  'Innovation, Science & Economic Development Canada',
  'SBCCI',
  'FFBC',
  'Shared Services Canada',
  'Procurement Assistance Canada',
  "Women's Economic Council",
  'ISET',
  'BEBC Society',
  'Municipalities across BC',
  'Union Gospel Mission',
  'BC Housing Corporation',
]

export default function Work() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-warm-white" style={{ minHeight: '84vh' }}>
        {/* Faint photo right */}
        <div className="absolute right-0 top-0 w-[38%] h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-10"
            style={{ background: 'linear-gradient(90deg,#FDFCFA 0%,transparent 50%)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-work.jpg" alt=""
            className="w-full h-full object-cover object-top grayscale"
            style={{ opacity: 0.12 }} />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-20 py-24">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Our Work</span>
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.0] mb-4 tracking-[-0.01em]"
            style={{ fontSize: 'clamp(52px,6vw,84px)' }}>
            What we've<br />built together.
          </h1>

          <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[560px] mb-16">
            Real outcomes for real clients — in numbers, in stories, and in the organisations we've helped transform.
          </p>

          {/* 4-stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-kc-linen border border-kc-linen">
            {[
              { val: '3,000', sup: '+', desc: 'Entrepreneurs trained nationally through Kasandy-led programs', red: false },
              { val: '17–21', sup: '', desc: 'Businesses securing contracts, including multi-million-dollar deals', red: true },
              { val: '250', sup: '+', desc: 'Indigenous entrepreneurs trained via ISET partnership', red: false },
              { val: "Canada's\nFirst", sup: '', desc: 'National supplier-focused procurement readiness course', sm: true },
            ].map((s, i) => (
              <div key={i} className="bg-kc-warm-white px-8 py-9 hover:bg-kc-cream transition-colors">
                <span className={`font-display font-bold leading-none block ${s.red ? 'text-kc-brown' : s.sm ? 'text-kc-sand text-[28px]' : 'text-kc-charcoal'}`}
                  style={!s.sm ? { fontSize: '52px' } : {}}>
                  {s.val.split('\n').map((line, j) => <span key={j}>{line}{j < s.val.split('\n').length - 1 && <br />}</span>)}
                  {s.sup && <span className="text-kc-brown" style={{ fontSize: '0.55em' }}>{s.sup}</span>}
                </span>
                <p className="font-sans text-[11.5px] text-kc-text-lt mt-3 leading-[1.5]">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/work#case-studies" className="btn-brown">See the Case Studies</Link>
            <Link href="/work#partners" className="btn-outline">View Our Partners</Link>
          </div>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-kc-brown">Impact</span>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-16">By the numbers.</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-white/10">
            {stats.map(s => (
              <div key={s.value} className="bg-kc-black p-10">
                <p className="font-display text-5xl md:text-6xl font-light text-kc-brown mb-3">{s.value}</p>
                <p className="font-sans text-xs text-white/60 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Case Studies</span>
          <h2 className="section-heading mb-4">Featured Work</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-16 max-w-xl">Detailed case studies for clients who have authorised publication. Names and details anonymised where requested.</p>

          <div className="space-y-0">
            {caseStudies.map((cs, i) => (
              <div key={cs.number} className={`py-16 ${i < caseStudies.length - 1 ? 'border-b border-kc-gray-border' : ''}`}>
                <div className="grid md:grid-cols-3 gap-12">
                  <div>
                    <p className="font-sans text-[11px] tracking-widest text-kc-brown mb-3">{cs.number}</p>
                    <h3 className="font-display text-2xl font-light leading-snug mb-3">{cs.label}</h3>
                    <p className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid mb-1">Client</p>
                    <p className="font-sans text-xs text-kc-black mb-4">{cs.client}</p>
                    <p className="font-sans text-sm text-kc-gray-mid leading-relaxed italic">{cs.tagline}</p>
                  </div>
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">The Challenge</p>
                      <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{cs.challenge}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Approach</p>
                      <div className="space-y-2">
                        {cs.approach.map(a => (
                          <div key={a} className="flex items-start gap-3">
                            <span className="text-kc-brown shrink-0 mt-0.5 text-xs">—</span>
                            <p className="font-sans text-sm text-kc-gray-mid">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-kc-gray-light p-6">
                      <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Results</p>
                      <div className="space-y-2">
                        {cs.results.map(r => (
                          <div key={r} className="flex items-start gap-3">
                            <span className="text-kc-brown shrink-0 mt-0.5 text-xs">✓</span>
                            <p className="font-sans text-sm text-kc-black">{r}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners & Funders */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Partners & Funders</span>
          <h2 className="section-heading mb-12">Who We've Worked With</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {partners.map(p => (
              <div key={p} className="border border-kc-gray-border bg-white px-6 py-4 flex items-center">
                <span className="text-kc-brown mr-3 shrink-0">—</span>
                <p className="font-sans text-sm text-kc-gray-mid">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Testimonials</span>
          <h2 className="section-heading mb-12">What Clients Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="card relative">
                <div className="absolute top-4 right-4 bg-kc-gray-light px-2 py-1">
                  <p className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid">Pending</p>
                </div>
                <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-4">PLACEHOLDER</p>
                <p className="font-display text-lg font-light italic text-kc-gray-mid leading-relaxed mb-6">
                  "Testimonial copy will appear here once approved through the admin panel."
                </p>
                <div className="border-t border-kc-gray-border pt-4">
                  <p className="font-sans text-sm font-medium text-kc-black">Client Name</p>
                  <p className="font-sans text-xs text-kc-gray-mid mt-0.5">Title, Organisation</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-kc-black text-white">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-4xl font-light text-white mb-5">Ready to build results like these?</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-10">
            Every engagement starts with a conversation. Let's find out if we're the right fit.
          </p>
          <Link href="/contact" className="btn-brown">Work With Us</Link>
        </div>
      </section>

    </div>
  )
}
