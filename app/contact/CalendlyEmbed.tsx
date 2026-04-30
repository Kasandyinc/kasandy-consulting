'use client'

import { useEffect } from 'react'

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL

export default function CalendlyEmbed() {
  useEffect(() => {
    if (!CALENDLY_URL) return
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  if (!CALENDLY_URL) {
    return (
      <div className="bg-kc-charcoal text-white p-12 md:p-16 text-center max-w-2xl mx-auto">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-kc-brown/80 mb-4">15-Minute Strategy Call</p>
        <p className="font-display text-3xl font-light mb-5">
          Book your free call with Jackee.
        </p>
        <p className="font-sans text-sm text-white/60 leading-relaxed mb-8 max-w-md mx-auto">
          No pitch. No pressure. Bring your goals — we&apos;ll bring questions. 15 minutes of honest conversation about where you are and where you want to go.
        </p>
        <a
          href="https://calendly.com/kasandyconsulting"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-10 py-4 bg-kc-brown text-white text-xs tracking-widest uppercase font-sans font-medium hover:bg-white hover:text-kc-brown transition-colors"
        >
          Book on Calendly →
        </a>
      </div>
    )
  }

  return (
    <div
      className="calendly-inline-widget w-full"
      data-url={CALENDLY_URL}
      style={{ minWidth: '320px', height: '700px' }}
    />
  )
}
