import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Linkedin, Instagram } from 'lucide-react'
import ContactForm from './ContactForm'
import CalendlyEmbed from './CalendlyEmbed'


export const metadata: Metadata = {
  title: 'Book a Strategy Call',
  description: "Book a complimentary strategy call with Jackee Kasandy. Procurement strategy, business coaching, non-profit consulting, and Canadian market entry.",
  openGraph: { images: [{ url: '/images/hero-contact.jpg', width: 1200, height: 630 }] },
}

export default function Contact() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-warm-white" style={{ minHeight: '78vh' }}>
        {/* Faint photo right */}
        <div className="absolute right-0 top-0 w-[44%] h-full z-[1] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-10"
            style={{ background: 'linear-gradient(90deg,#FDFCFA 0%,transparent 36%)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-contact.jpg" alt=""
            className="w-full h-full object-cover object-top" style={{ opacity: 0.45 }} />
        </div>

        <div className="relative z-[2] w-full max-w-7xl mx-auto px-6 md:px-20 py-24">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-sand flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-text-lt">Contact &amp; Book</span>
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.0] mb-6 tracking-[-0.01em]"
            style={{ fontSize: 'clamp(46px,5.5vw,74px)' }}>
            Let&apos;s get<br />to <em className="italic text-kc-brown">work.</em>
          </h1>

          <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[480px] mb-9">
            Book a complimentary 15-minute strategy call, or submit a project inquiry. We typically respond within one business day.
          </p>

          <Link href="#book" className="btn-brown">Book a 15-Minute Strategy Call</Link>
        </div>
      </section>

      {/* Calendly */}
      <section id="book" className="py-20 px-6 bg-kc-gray-light border-b border-kc-gray-border">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Book a Call</span>
          <h2 className="section-heading mb-4">Schedule a Strategy Call</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-12 max-w-xl">
            A complimentary 15-minute call to discuss your goals and whether we&apos;re the right fit. No pitch, no pressure.
          </p>
          <CalendlyEmbed />
        </div>
      </section>

      {/* Project Inquiry Form */}
      <section id="inquiry" className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div>
            <span className="section-label">Project Inquiry</span>
            <h2 className="section-heading mb-6">Prefer to send details first?</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">
              Fill in the form and we&apos;ll follow up to schedule a conversation.
            </p>
          </div>
          <div className="md:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Location & Hours */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="border border-kc-gray-border bg-white p-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-5">Location &amp; Hours</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-kc-brown shrink-0 mt-0.5" />
                <div>
                  <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Location</p>
                  <p className="font-sans text-sm text-kc-black">Vancouver, BC, Canada</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={15} className="text-kc-brown shrink-0 mt-0.5" />
                <div>
                  <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Office Hours</p>
                  <p className="font-sans text-sm text-kc-black">Mon–Fri, 9AM–5PM Pacific Time</p>
                </div>
              </div>
              <div className="ml-6">
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Response Time</p>
                <p className="font-sans text-sm text-kc-black">Within 2 business days</p>
              </div>
            </div>
          </div>

          <div className="border border-kc-gray-border bg-white p-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-5">Connect</p>
            <div className="space-y-4">
              <a href="https://www.linkedin.com/in/jackeekasandy" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid hover:text-kc-brown transition-colors">
                <Linkedin size={15} className="text-kc-brown shrink-0" />
                LinkedIn — Jackee Kasandy
              </a>
              <a href="https://instagram.com/kasandyinc" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid hover:text-kc-brown transition-colors">
                <Instagram size={15} className="text-kc-brown shrink-0" />
                Instagram — @kasandyinc
              </a>
            </div>
          </div>

          <div className="border border-kc-gray-border bg-white p-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-5">Speaking Enquiries</p>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-5">
              For keynotes, panels, workshops, and corporate sessions, please use the dedicated speaking inquiry form.
            </p>
            <Link href="/speaking#inquiry" className="btn-outline text-xs">
              Go to Speaking Inquiry →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
