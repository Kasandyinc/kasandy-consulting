export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import SpeakingInquiryForm from './SpeakingInquiryForm'
import SpeakingMedia from './SpeakingMedia'
import PageHero from '@/components/PageHero'

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

      <PageHero
        image="/images/hero-7.jpg"
        label="Jackee Kasandy — Speaker"
        title="A voice that bridges boardrooms and communities."
        subtitle="Jackee Kasandy brings twenty-five years of corporate strategy, entrepreneurship, and systemic advocacy to the stage. Her sessions are direct, evidence-based, and designed to move rooms — not just inspire them."
        position="object-top"
      />

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
