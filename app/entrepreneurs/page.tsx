import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Business Coaching & Procurement Strategy for Entrepreneurs | Kasandy Consulting',
  description: 'Win contracts, build systems, and grow your business with full-service coaching from Jackee Kasandy — who designed Canada\'s first procurement readiness course and has trained 3,000+ entrepreneurs.',
}

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

export default function Entrepreneurs() {
  return (
    <div className="pt-16">

      <PageHero
        image="/images/hero-entrepreneurs.jpg"
        label="For Entrepreneurs & Founders"
        titleHtml="Stop leaving<br>contracts on<br><em>the table.</em>"
        subtitle="Full-service business coaching and procurement strategy for founders who are ready to grow — and ready to win."
        position="object-top"
      />

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
            {[
              {
                tier: 'Foundation',
                subtitle: '90-Day Coaching Program',
                for: 'Founders establishing systems and direction — early stage to $500K revenue',
                includes: [
                  '6 × bi-weekly 90-minute coaching sessions',
                  'Business model and operations audit',
                  'Capability statement development',
                  'Procurement readiness assessment',
                  'Email support between sessions',
                  'Kasandy resource toolkit',
                ],
                outcome: 'A clear 90-day action plan, a polished capability statement, and a mapped procurement entry pathway',
              },
              {
                tier: 'Accelerator',
                subtitle: '6-Month Full Service',
                for: 'Founders ready to compete for contracts and scale — $200K–$2M revenue range',
                includes: [
                  'Everything in Foundation',
                  'Bid and proposal review (up to 3 submissions)',
                  'Certification readiness roadmap (CAMSC, CCAB, WBE, etc.)',
                  'Marketing and brand positioning session',
                  'Fundraising and grant strategy session',
                  'Buyer introduction support (where applicable)',
                  'Monthly progress report',
                ],
                outcome: 'Active procurement submissions, certification application in progress, and at least one qualified buyer introduction',
                featured: true,
              },
              {
                tier: 'Partner',
                subtitle: 'Annual Advisory Retainer',
                for: 'Founders who want Jackee in their corner year-round — growth and scale stage',
                includes: [
                  'Everything in Accelerator',
                  'Monthly advisory retainer (ongoing strategic support)',
                  'Fractional COO / strategic advisor services',
                  'Priority bid and proposal turnaround',
                  'Speaking and pitch preparation support',
                  'VIP access to all Kasandy programs and events',
                ],
                outcome: 'A sustained competitive advantage in procurement — with a senior strategic partner permanently on your side',
              },
            ].map((p) => (
              <div key={p.tier} className={`p-8 border ${p.featured ? 'border-kc-brown bg-white shadow-md' : 'border-kc-gray-border bg-white'}`}>
                {p.featured && <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Most Popular</p>}
                <h3 className="font-display text-2xl font-light mb-1">{p.tier}</h3>
                <p className="font-sans text-xs text-kc-gray-mid mb-4">{p.subtitle}</p>
                <div className="border-t border-kc-gray-border pt-4 mb-4">
                  <p className="font-sans text-[11px] tracking-wide uppercase text-kc-gray-mid mb-1">For</p>
                  <p className="font-sans text-xs text-kc-black mb-4">{p.for}</p>
                  <p className="font-sans text-[11px] tracking-wide uppercase text-kc-gray-mid mb-2">Includes</p>
                  <ul className="space-y-1.5">
                    {p.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-kc-brown shrink-0 text-xs">—</span>
                        <span className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-kc-gray-border pt-4 mb-6">
                  <p className="font-sans text-[11px] tracking-wide uppercase text-kc-gray-mid mb-1">Outcome</p>
                  <p className="font-sans text-xs text-kc-black italic leading-relaxed">{p.outcome}</p>
                </div>
                <Link href="/contact" className={p.featured ? 'btn-brown w-full justify-center' : 'btn-outline w-full justify-center'}>
                  Inquire About This Program
                </Link>
              </div>
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
