import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import ContactForm from './ContactForm'
import CalendlyEmbed from './CalendlyEmbed'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Book a Strategy Call | Kasandy Consulting',
  description: "Book a complimentary strategy call with Jackee Kasandy. Procurement strategy, business coaching, non-profit consulting, and Canadian market entry.",
}

export default function Contact() {
  return (
    <div className="pt-16">

      <PageHero
        image="/images/hero-contact.jpg"
        label="Contact & Book"
        titleHtml="Let's get<br>to <em>work.</em>"
        subtitle="Book a complimentary 15-minute strategy call, submit a project inquiry, or send a message. We typically respond within one business day."
        position="object-center"
      />

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
