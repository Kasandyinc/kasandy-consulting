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
      <div className="border border-dashed border-kc-gray-border bg-white p-12 text-center">
        <p className="font-display text-2xl font-light text-kc-black mb-3">Calendly Booking</p>
        <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-4 max-w-lg mx-auto">
          A Calendly widget will embed here. Add your Calendly URL to the <code className="bg-kc-gray-light px-2 py-0.5 text-kc-brown">NEXT_PUBLIC_CALENDLY_URL</code> environment variable to activate it.
        </p>
        <p className="font-sans text-xs text-kc-gray-mid">
          In the meantime, use the project inquiry form below or contact us directly.
        </p>
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
