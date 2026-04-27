import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import ContactForm from './ContactForm'
import CalendlyEmbed from './CalendlyEmbed'


export const metadata: Metadata = {
  title: 'Book a Strategy Call | Kasandy Consulting',
  description: "Book a complimentary strategy call with Jackee Kasandy. Procurement strategy, business coaching, non-profit consulting, and Canadian market entry.",
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

        <div className="relative z-[2] w-full max-w-7xl mx-auto px-6 md:px-20 py-24 grid md:grid-cols-[1fr_340px] gap-16 md:gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-sand flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-text-lt">Contact &amp; Book</span>
            </div>

            <h1 className="font-display font-bold text-kc-charcoal leading-[1.0] mb-6 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(46px,5.5vw,74px)' }}>
              Let's get<br />to <em className="italic text-kc-brown">work.</em>
            </h1>

            <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[480px] mb-9">
              Book a complimentary 15-minute strategy call, submit a project inquiry, or send a message. We typically respond within one business day.
            </p>

            <Link href="#book" className="btn-brown">Book a 15-Minute Strategy Call</Link>
          </div>

          {/* Right: contact options */}
          <div className="hidden md:flex flex-col gap-2.5">
            {[
              { icon: <Mail size={16} />, label: 'Email', value: 'consulting@kasandy.com' },
              { icon: <Phone size={16} />, label: 'Phone / WhatsApp', value: '778-385-4480' },
              { icon: <MapPin size={16} />, label: 'Location', value: 'Vancouver, BC — Canada & International' },
            ].map((opt, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 bg-white border-[1.5px] border-kc-linen hover:border-kc-brown transition-colors">
                <div className="w-[34px] h-[34px] bg-kc-brown flex items-center justify-center flex-shrink-0 text-white">
                  {opt.icon}
                </div>
                <div>
                  <div className="font-sans text-[12px] font-semibold text-kc-charcoal tracking-[0.04em]">{opt.label}</div>
                  <div className="font-sans text-[11px] text-kc-text-lt mt-0.5">{opt.value}</div>
                </div>
              </div>
            ))}
            <Link href="#inquiry" className="btn-outline text-center justify-center mt-1">Submit a Project Inquiry</Link>
          </div>
        </div>
      </section>

      {/* Calendly */}
      <section className="py-20 px-6 bg-kc-gray-light border-b border-kc-gray-border">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Book a Call</span>
          <h2 className="section-heading mb-4">Schedule a Strategy Call</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-12 max-w-xl">
            A complimentary 15-minute call to discuss your goals and whether we're the right fit. No pitch, no pressure.
          </p>
          <CalendlyEmbed />
        </div>
      </section>

      {/* Project Inquiry Form */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div>
            <span className="section-label">Project Inquiry</span>
            <h2 className="section-heading mb-6">Tell us about your project.</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-8">
              Prefer to send details first? Use this form and we will follow up to schedule a conversation.
            </p>
            <div className="space-y-5">
              <a href="mailto:jackee@kasandy.com" className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid hover:text-kc-brown transition-colors">
                <Mail size={16} className="text-kc-brown shrink-0" />
                jackee@kasandy.com
              </a>
              <a href="tel:7783854480" className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid hover:text-kc-brown transition-colors">
                <Phone size={16} className="text-kc-brown shrink-0" />
                778-385-4480
              </a>
              <div className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid">
                <MapPin size={16} className="text-kc-brown shrink-0" />
                Vancouver, BC, Canada
              </div>
              <div className="flex items-center gap-3 font-sans text-sm text-kc-gray-mid">
                <Clock size={16} className="text-kc-brown shrink-0" />
                Mon–Fri, 9AM–5PM PT
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Contact Details */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="border border-kc-gray-border bg-white p-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-5">Direct Contact</p>
            <div className="space-y-4">
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Email</p>
                <a href="mailto:jackee@kasandy.com" className="font-sans text-sm text-kc-black hover:text-kc-brown transition-colors">jackee@kasandy.com</a>
              </div>
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Phone</p>
                <a href="tel:7783854480" className="font-sans text-sm text-kc-black hover:text-kc-brown transition-colors">778-385-4480</a>
              </div>
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">WhatsApp</p>
                <a href="https://wa.me/17783854480" target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-kc-black hover:text-kc-brown transition-colors">+1 778-385-4480</a>
              </div>
            </div>
          </div>
          <div className="border border-kc-gray-border bg-white p-8">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-5">Location & Hours</p>
            <div className="space-y-4">
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Location</p>
                <p className="font-sans text-sm text-kc-black">Vancouver, BC, Canada</p>
              </div>
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Office Hours</p>
                <p className="font-sans text-sm text-kc-black">Mon–Fri, 9AM–5PM Pacific Time</p>
              </div>
              <div>
                <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Response Time</p>
                <p className="font-sans text-sm text-kc-black">Within 2 business days</p>
              </div>
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
