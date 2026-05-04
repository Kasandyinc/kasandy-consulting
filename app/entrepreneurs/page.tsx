import type { Metadata } from 'next'
import Link from 'next/link'
import ProgramCard from '@/components/ProgramCard'
import { kv } from '@vercel/kv'

export const metadata: Metadata = {
  title: 'Business Coaching & Procurement Strategy for Entrepreneurs',
  description: 'Win contracts, build systems, and grow your business with full-service coaching from Jackee Kasandy — who designed Canada\'s first procurement readiness course and has trained 3,000+ entrepreneurs.',
  openGraph: { images: [{ url: '/images/hero-entrepreneurs.jpg', width: 1200, height: 630 }] },
}

export const dynamic = 'force-dynamic'

type ProgramData = {
  tier: string
  subtitle: string
  fromPrice: string
  description: string
  includes: string[]
  outcome?: string
  ideal?: string
  featured?: boolean
  requestProposal?: boolean
  ctaLabel?: string
  ctaHref?: string
}

const hardcodedPrograms: ProgramData[] = [
  {
    tier: 'Foundation',
    subtitle: '90-Day Coaching Program',
    fromPrice: 'Investment — quoted after Discovery Session',
    description: 'For founders establishing systems and direction — early stage to $500K revenue. Builds your foundation for procurement readiness in 90 days.',
    includes: [
      '6 × bi-weekly 90-minute coaching sessions',
      'Business model and operations audit',
      'Capability statement development',
      'Procurement readiness assessment',
      'Email support between sessions',
      'Kasandy resource toolkit',
    ],
    outcome: 'A clear 90-day action plan, a polished capability statement, and a mapped procurement entry pathway.',
    ctaLabel: 'Inquire About Foundation',
  },
  {
    tier: 'Accelerator',
    subtitle: '6-Month Full Service',
    fromPrice: 'Investment — quoted after Discovery Session',
    description: 'For founders ready to compete for contracts and scale — $200K–$2M revenue range. Full procurement support through to active bid submissions.',
    includes: [
      'Everything in Foundation',
      'Bid and proposal review (up to 3 submissions)',
      'Certification readiness roadmap (CAMSC, CCAB, WBE, etc.)',
      'Marketing and brand positioning session',
      'Fundraising and grant strategy session',
      'Buyer introduction support (where applicable)',
      'Monthly progress report',
    ],
    outcome: 'Active procurement submissions, certification application in progress, and at least one qualified buyer introduction.',
    featured: true,
    ctaLabel: 'Inquire About Accelerator',
  },
  {
    tier: 'Partner',
    subtitle: 'Annual Advisory Retainer',
    fromPrice: 'Custom proposal',
    description: 'For founders who want Jackee in their corner year-round — growth and scale stage. Ongoing strategic advisory with priority access.',
    includes: [
      'Everything in Accelerator',
      'Monthly advisory retainer (ongoing strategic support)',
      'Fractional COO / strategic advisor services',
      'Priority bid and proposal turnaround',
      'Speaking and pitch preparation support',
      'VIP access to all Kasandy programs and events',
    ],
    outcome: 'A sustained competitive advantage in procurement — with a senior strategic partner permanently on your side.',
    requestProposal: true,
    ctaLabel: 'Request a Proposal',
  },
]

const qualifiers = [
  "You're running a business but building it by intuition instead of strategy — and you know it.",
  "You know procurement contracts exist but you can't figure out how to get in the door.",
  "You're working toward certification (CAMSC, CCAB, WBE) but the process feels overwhelming.",
  "You've tried writing proposals before and they haven't worked — and you don't know why.",
  "You need someone who has actually been in both the entrepreneurial trenches and the institutional boardrooms.",
  "You want a coach who will tell you the truth and then help you do something about it.",
]

const outcomes = [
  '17–21 businesses trained in Kasandy-led programs have reported securing procurement contracts, including multi-million-dollar deals',
  'Capability statements refined and approved for submission to federal and corporate buyers',
  'Certifications achieved: CAMSC, CCAB, BEBC Society, and others',
  'First RFP responses submitted within 90 days of starting the program',
  'Funders and grant applications secured through coaching support',
  'Business models restructured for sustainable, scalable growth',
]

const faqs = [
  {
    q: "I've never applied for a procurement contract before. Is this program still for me?",
    a: 'Yes. Most clients start with no procurement experience. We build your knowledge and your confidence at the same time. The goal is to have you submission-ready within your first program cycle.',
  },
  {
    q: "I'm already certified (or in the process). Can you still help?",
    a: "Absolutely. Certification is step one. Winning contracts requires a capability statement that buyers remember, proposals that answer exactly what the tender is asking, and a strategy for getting in front of the right buyers. That's where most certified businesses get stuck — and where we work.",
  },
  {
    q: 'How long before I can expect to see results?',
    a: 'Most Accelerator clients submit their first proposal within 60–90 days. Procurement cycles vary — government tenders can take 3–6 months to close. We focus on building your pipeline so you always have active opportunities in motion.',
  },
  {
    q: "Do you guarantee that I'll win contracts?",
    a: "No responsible advisor guarantees contract awards — that decision belongs to the buyer. What we guarantee is that your submissions will be significantly more competitive than they were before. Businesses we coach consistently outperform their previous bid results.",
  },
  {
    q: 'What is the investment?',
    a: 'Programs are scoped individually. Discovery Sessions start at $400. Foundation and Accelerator programs are quoted after the discovery session based on your specific needs and stage. We provide transparent, itemised proposals before any work begins.',
  },
  {
    q: 'Can I get funding to cover the cost of coaching?',
    a: 'In many cases, yes. Various federal and provincial programs fund business coaching and procurement readiness training for eligible businesses. We\'ll help you identify what you may qualify for.',
  },
]

export default async function Entrepreneurs() {
  const kvData = await kv.get<{ entrepreneurs?: ProgramData[] }>('programs:all')
  const programs: ProgramData[] = kvData?.entrepreneurs && kvData.entrepreneurs.length > 0
    ? kvData.entrepreneurs
    : hardcodedPrograms

  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-linen" style={{ minHeight: '90vh' }}>
        {/* Photo right */}
        <div className="absolute right-0 top-0 w-[46%] h-full z-[1] overflow-hidden">
          <div className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg,#EDE5D8 0%,transparent 28%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-[30%] z-10 pointer-events-none"
            style={{ background: 'linear-gradient(180deg,transparent,rgba(237,229,216,.7))' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-entrepreneurs.jpg" alt=""
            className="w-full h-full object-cover object-top" />
        </div>

        {/* Left copy */}
        <div className="relative z-[2] px-8 lg:px-20 py-24 max-w-[580px]">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">For Entrepreneurs &amp; Founders</span>
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.0] mb-7 tracking-[-0.01em]"
            style={{ fontSize: 'clamp(50px,5.5vw,78px)' }}>
            Stop leaving<br />contracts on<br />
            <em className="italic text-kc-brown">the table.</em>
          </h1>

          <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[460px] mb-8">
            Full-service business coaching and procurement strategy for founders who are ready to grow — and ready to win.
          </p>

          {/* Proof stat */}
          <div className="mb-8 p-5 border-l-[3px] border-kc-brown max-w-[400px]"
            style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="font-display font-bold text-kc-brown leading-none" style={{ fontSize: '48px' }}>17–21</div>
            <p className="font-sans text-[13px] text-kc-text-mid mt-1.5 leading-[1.55]">
              Businesses from Kasandy-led programs secured procurement contracts — including multi-million-dollar deals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn-brown">Book a Strategy Call</Link>
            <Link href="/entrepreneurs#programs" className="btn-outline">See Our Programs</Link>
          </div>
        </div>
      </section>

      {/* Qualification */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
          <div>
            <span className="section-label">Is This For You?</span>
            <h2 className="section-heading mb-12">This is for you if…</h2>
            <div className="space-y-5">
              {qualifiers.map((q) => (
                <div key={q} className="flex items-start gap-4">
                  <span className="text-kc-brown shrink-0 mt-0.5 font-display text-xl">→</span>
                  <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-kc-gray-light p-10 border border-kc-gray-border">
            <span className="section-label">What You Get</span>
            <h2 className="font-display text-3xl font-light mb-6">What Jackee Brings</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-5">
              Jackee Kasandy built a 7-figure retail business from scratch. She designed Canada's first procurement readiness course. She's trained over 3,000 entrepreneurs. She currently sits on a federal housing board. When she coaches a founder, you're not getting theory — you're getting someone who has walked the path, knows every shortcut, and has learned from every wrong turn.
            </p>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">
              More than that: Jackee has the relationships. Procurement is a relationship game. She knows the buyers, the certifying bodies, the funders, and the networks — and she helps clients access them.
            </p>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Programs</span>
          <h2 className="section-heading mb-4">Choose Your Program</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-16 max-w-xl">
            Every engagement starts with a paid Discovery Session — a 90-minute strategy audit. From there, you choose the program that fits your stage and goals.
          </p>

          {/* Discovery Session */}
          <div className="bg-kc-brown text-white p-10 mb-8">
            <p className="font-sans text-[11px] tracking-widest uppercase text-white/70 mb-2">Entry Point</p>
            <h3 className="font-display text-3xl font-light mb-3">Discovery Session</h3>
            <p className="font-sans text-sm text-white/80 leading-relaxed mb-6 max-w-xl">
              A 90-minute paid strategy audit with Jackee. She reviews your business, diagnoses the top three blockers to growth and procurement success, and delivers a written action plan.
            </p>
            <p className="font-display text-2xl text-white mb-8">Investment: from $400</p>
            <SquareCheckoutButton label="Book Your Discovery Session" amount={40000} itemName="Discovery Session — 90-Minute Strategy Audit" />
          </div>

          {/* Three tiers */}
          <div className="grid md:grid-cols-3 gap-6">
            {programs.map(p => (
              <ProgramCard key={p.tier} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Results</span>
          <h2 className="section-heading mb-12">What clients achieve</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {outcomes.map((o) => (
              <div key={o} className="flex items-start gap-4 border border-kc-gray-border p-6">
                <span className="text-kc-brown shrink-0 font-display text-xl">—</span>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-4xl mx-auto">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading mb-12">Common Questions</h2>
          <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-kc-gray-border pb-8">
                <h3 className="font-display text-xl font-light mb-3">{faq.q}</h3>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grant & Fundraising Support */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Grant &amp; Fundraising Support</span>
          <h2 className="section-heading mb-4">Grant writing isn&apos;t a commodity.</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-12 max-w-2xl leading-relaxed">
            Scope, complexity, and the time required vary enormously based on where your organisation actually is — the clarity of your impact story, the quality of your data, and your previous funder experience. We price for the real work, not for an average.
          </p>
          <p className="font-sans text-sm text-kc-gray-mid mb-10 max-w-2xl leading-relaxed">
            Every grant engagement starts with a <strong className="text-kc-black">Grant Readiness Assessment ($500)</strong> — a 90-minute session that tells you exactly which tier you&apos;re in, which funders are your best targets, and what needs to happen before any application is submitted. Credited in full against any program booked within 60 days.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { name: 'Grant Readiness Assessment', price: '$500', desc: '90-minute session + written report + funder shortlist. Required before any grant writing engagement.' },
              { name: 'Grant Writing — Tier 1', sub: 'Grant-Ready Orgs', price: 'From $1,500', desc: 'Clear story, defined programs, available data. Narrative writing, budget review, compliance, submission.' },
              { name: 'Grant Writing — Tier 2', sub: 'Developing Orgs', price: 'From $2,800', desc: 'Needs narrative development and program logic work before writing. Includes everything in Tier 1 plus development sessions.' },
              { name: 'Grant Writing — Tier 3', sub: 'Federal / Complex', price: 'From $4,500', desc: 'Federal programs, $200K+ applications. Full logic models, evaluation frameworks, multi-year budgets.' },
              { name: 'Grant Strategy Program', sub: '3 Months', price: 'From $5,500', desc: 'Funder mapping, readiness assessment, narrative development, support for up to 2 applications.' },
              { name: 'Funder Mapping Session', price: '$300', desc: '60-minute session + written shortlist of 8–12 matched funders with eligibility notes and application windows.' },
            ].map((item) => (
              <div key={item.name} className="border border-kc-gray-border bg-white p-6">
                <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-1">{item.sub || 'Grant Support'}</p>
                <h3 className="font-display text-lg font-light mb-1">{item.name}</h3>
                <p className="font-display text-xl text-kc-brown mb-3">{item.price}</p>
                <p className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/contact?tag=grant" className="btn-brown">Start with a Grant Readiness Assessment</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-kc-brown text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-4xl font-light mb-5">Ready to compete for contracts?</h2>
          <p className="font-sans text-sm text-white/80 mb-10">Start with a Discovery Session — 90 minutes that will give you complete clarity on where your business stands and exactly what to do next.</p>
          <SquareCheckoutButton label="Book Your Discovery Session — $400" amount={40000} itemName="Discovery Session — 90-Minute Strategy Audit" white />
        </div>
      </section>

    </div>
  )
}

function SquareCheckoutButton({ label, amount, itemName, white }: {
  label: string; amount: number; itemName: string; white?: boolean
}) {
  return (
    <form action="/api/square/checkout" method="POST">
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="itemName" value={itemName} />
      <button type="submit"
        className={white
          ? 'inline-flex items-center px-10 py-4 bg-white text-kc-brown text-xs tracking-widest uppercase font-sans font-medium hover:bg-kc-black hover:text-white transition-colors'
          : 'inline-flex items-center px-10 py-4 bg-white text-kc-brown text-xs tracking-widest uppercase font-sans font-medium hover:bg-kc-black hover:text-white transition-colors'
        }>
        {label}
      </button>
    </form>
  )
}
