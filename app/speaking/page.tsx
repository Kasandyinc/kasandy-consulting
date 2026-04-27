export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import SpeakingInquiryForm from './SpeakingInquiryForm'
import SpeakingMedia from './SpeakingMedia'


export const metadata: Metadata = {
  title: 'Book Jackee Kasandy to Speak | Procurement, Supplier Diversity & Entrepreneurship Keynotes',
  description: 'Book Jackee Kasandy for keynotes, panels, workshops, and corporate sessions on procurement, supplier diversity, entrepreneurship, and equity-centred leadership.',
}

const topics = [
  {
    number: '01',
    title: 'The Procurement Opportunity Nobody Talks About',
    description: "Canada spends over $200 billion annually on government contracts — and most of it goes to the same suppliers. This keynote breaks open the system: who holds the contracts, what buyers are actually looking for, and how underrepresented suppliers can compete for and win public sector business. No jargon. No feel-good framing. Just the system, mapped.",
    audience: 'Government agencies, corporate procurement teams',
  },
  {
    number: '02',
    title: 'Supplier Diversity as Economic Strategy',
    description: "Supplier diversity is not charity. It is one of the most underpowered economic growth strategies available to Canadian corporations — and most executives still treat it as a compliance issue. This session builds the business case from first principles: what happens to margins, talent, and innovation when you diversify your supply chain intentionally.",
    audience: 'Corporations, C-suite',
  },
  {
    number: '03',
    title: 'From Founder to Procurement-Ready — What They Don\'t Teach You',
    description: "The gap between running a great business and winning a government contract is not about quality. It\'s about knowing the language, the systems, and the unwritten rules. After training over 3,000 entrepreneurs, Jackee breaks down exactly what founders get wrong — and what a procurement-ready business actually looks like.",
    audience: 'Entrepreneur conferences',
  },
  {
    number: '04',
    title: 'Building for Belonging — Equity-Centred Leadership in Practice',
    description: "Equity-centred leadership isn\'t a values statement — it\'s a decision-making framework. This session examines what belonging looks like when it\'s built into hiring, policy, and program design rather than bolted on after the fact. Practical, uncomfortable, and necessary.",
    audience: 'Non-profit leaders, HR teams',
  },
  {
    number: '05',
    title: 'The Global Opportunity — African Businesses and the Canadian Market',
    description: "Canada is one of the most transparent and accessible procurement markets in the world — if you know how to enter it. This session is a direct briefing for African entrepreneurs and diaspora founders on what Canadian buyers look for, what disqualifies applicants early, and how to build credibility in a new market.",
    audience: 'Trade conferences, diaspora networks',
  },
  {
    number: '06',
    title: 'The Non-Profit Trap — Why Good Missions Fail and How to Break the Cycle',
    description: "Passion is not a business model. Too many non-profits are one funding cycle away from collapse — not because they lack impact, but because they\'ve built their organisations on dependency rather than sustainability. This session diagnoses the structural patterns that keep mission-driven organisations stuck and maps the way out.",
    audience: 'Non-profit conferences',
  },
]

const formats = [
  { name: 'Keynote', detail: '45–60 min' },
  { name: 'Panel', detail: 'Moderator or panellist' },
  { name: 'Workshop / Masterclass', detail: '2–4 hr' },
  { name: 'Corporate Lunch & Learn', detail: '60–90 min' },
  { name: 'Conference Breakout', detail: '45–60 min' },
  { name: 'University / Academic Lecture', detail: '60–90 min' },
  { name: 'Emcee / Host', detail: 'Half or full day' },
]

export default function Speaking() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: '94vh' }}>
        {/* Full photo with warm-white overlay from left */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-speaking.jpg" alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_18%]" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(110deg,rgba(253,252,250,.97) 0%,rgba(253,252,250,.88) 45%,rgba(253,252,250,.45) 100%)' }} />
        {/* Decorative quote mark */}
        <span className="absolute left-12 top-5 font-display font-bold text-kc-brown/[0.05] select-none pointer-events-none z-[1]"
          style={{ fontSize: '320px', lineHeight: 1 }}>&ldquo;</span>

        <div className="relative z-[2] w-full max-w-7xl mx-auto px-6 md:px-20 py-24 grid md:grid-cols-[1fr_360px] gap-16 md:gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Speaking &amp; Keynotes</span>
            </div>

            <h1 className="font-display font-bold text-kc-charcoal leading-[1.0] mb-7 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(46px,5.5vw,76px)' }}>
              A voice that bridges<br />
              <em className="italic text-kc-brown block">boardrooms</em>
              and communities.
            </h1>

            <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[500px] mb-8">
              25 years of hard-won experience on every stage. Direct, practical, designed to move people from inspired to equipped.
            </p>

            {/* Topics */}
            <div className="flex flex-col mb-9">
              {[
                'From Kenya to Canada: Building a 7-Figure Ethical Brand',
                'Procurement as a Growth Strategy: How Diverse Suppliers Win',
                'Rewriting the Narrative: Black Entrepreneurship in Canada',
                'Breaking Barriers: Women Leading in Business',
                'Social Impact Through Business: The New Model of Entrepreneurship',
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3 border-b border-kc-linen text-[13.5px] text-kc-text-lt">
                  <span className="block w-5 h-px bg-kc-brown flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className="btn-brown">Enquire About Booking Jackee</Link>
              <Link href="#speaker-kit" className="btn-outline">Download Speaker Kit</Link>
            </div>
          </div>

          {/* Right: Media coverage card */}
          <div className="hidden md:block bg-white border border-kc-linen p-9"
            style={{ boxShadow: '0 4px 32px rgba(113,47,30,.07)' }}>
            <div className="font-mono text-[9px] tracking-[0.2em] text-kc-text-lt uppercase pb-4 mb-5 border-b border-kc-linen">
              Media Coverage
            </div>
            {['Globe and Mail', 'Global News Morning', 'CP24 Live Interview', 'CBC Radio',
              'CTV Montreal', 'The Morning Show', 'Vancouver Sun', 'Montecristo Magazine'].map(m => (
              <div key={m} className="flex items-center gap-2.5 py-2.5 border-b border-kc-linen text-[13px] text-kc-text-mid">
                <span className="w-1 h-1 bg-kc-brown rounded-full flex-shrink-0" />
                {m}
              </div>
            ))}
            <div className="mt-5 pt-4 border-t border-kc-linen">
              <div className="font-display font-bold text-kc-charcoal leading-none" style={{ fontSize: '36px' }}>2.4M</div>
              <div className="font-sans text-[11px] text-kc-text-lt mt-1">Earned Media Value | 380+ national mentions</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Jackee as Speaker */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <span className="section-label">About Jackee as a Speaker</span>
            <h2 className="section-heading mb-8">Substance, not just presence.</h2>
            <div className="space-y-5 font-sans text-sm text-kc-gray-mid leading-relaxed">
              <p>Jackee Kasandy is not a motivational speaker. She is a practitioner — someone who has built a business, founded a national non-profit, trained over 3,000 entrepreneurs, sat on government boards, and worked inside the systems she talks about. When she speaks about procurement, supplier diversity, or leadership, she is drawing from years of direct experience — not research summaries.</p>
              <p>Her speaking style is direct, structured, and engaging. She moves fluidly between lived experience and systems thinking, between policy and practicality. Audiences consistently describe her sessions as "the most honest room they've been in" — because she says the things that usually get softened.</p>
              <p>She has spoken at government briefings, national entrepreneur conferences, corporate leadership sessions, trade events, and university programs. She adapts her content for the room — but the standard stays the same.</p>
            </div>
          </div>
          <div className="space-y-8">
            <div className="border border-kc-gray-border bg-white p-6">
              <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-4">Speaking Stats</p>
              <div className="space-y-5">
                <div>
                  <p className="font-display text-4xl text-kc-black font-light">3,000+</p>
                  <p className="font-sans text-xs text-kc-gray-mid mt-1">Entrepreneurs trained through live programs</p>
                </div>
                <div>
                  <p className="font-display text-4xl text-kc-black font-light">National</p>
                  <p className="font-sans text-xs text-kc-gray-mid mt-1">Programs delivered coast-to-coast across Canada</p>
                </div>
                <div>
                  <p className="font-display text-4xl text-kc-black font-light">Multi-sector</p>
                  <p className="font-sans text-xs text-kc-gray-mid mt-1">Government, corporate, non-profit, and entrepreneur audiences</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaking Topics */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Speaking Topics</span>
          <h2 className="section-heading mb-4">Six Signature Sessions</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-16 max-w-xl">All topics are adapted to context and audience. Custom sessions available for organisations with specific program needs.</p>
          <div className="space-y-0">
            {topics.map((t, i) => (
              <div key={t.number} className={`py-10 ${i < topics.length - 1 ? 'border-b border-kc-gray-border' : ''}`}>
                <div className="grid md:grid-cols-4 gap-8">
                  <div>
                    <p className="font-sans text-[11px] tracking-widest text-kc-brown mb-2">{t.number}</p>
                    <h3 className="font-display text-2xl font-light leading-snug">{t.title}</h3>
                    <p className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid mt-4">Ideal for</p>
                    <p className="font-sans text-xs text-kc-gray-mid mt-1">{t.audience}</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{t.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Speaking Formats */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-kc-brown">Formats</span>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-12">Available Formats</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-white/10">
            {formats.map((f) => (
              <div key={f.name} className="bg-kc-black p-8">
                <p className="font-display text-xl font-light text-white mb-2">{f.name}</p>
                <p className="font-sans text-xs text-white/50">{f.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <a href="/files/jackee-kasandy-speaker-kit.pdf" download className="btn-outline border-white/30 text-white hover:bg-white hover:text-kc-black inline-flex items-center gap-2">
              <Download size={14} /> Download Full Speaker Kit
            </a>
          </div>
        </div>
      </section>

      {/* Photo / Video Gallery */}
      <SpeakingMedia />

      {/* Inquiry Form */}
      <section id="inquiry" className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div>
            <span className="section-label">Book Jackee</span>
            <h2 className="section-heading mb-6">Enquire About Booking</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-8">
              Complete the form and we will respond within 2 business days with availability and next steps.
            </p>
            <a href="/files/jackee-kasandy-speaker-kit.pdf" download className="btn-outline inline-flex items-center gap-2">
              <Download size={14} /> Download Speaker Kit
            </a>
          </div>
          <div className="md:col-span-2">
            <SpeakingInquiryForm />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-kc-black text-white">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-4xl font-light text-white mb-5">Ready to book?</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-10">
            Use the form above or reach out directly. We respond to all speaking inquiries within 2 business days.
          </p>
          <a href="#inquiry" className="btn-brown">Enquire About Booking Jackee</a>
        </div>
      </section>

    </div>
  )
}
