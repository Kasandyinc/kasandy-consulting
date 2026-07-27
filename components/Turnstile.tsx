'use client'

import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget. Renders only when a public site key is
// configured; otherwise it renders nothing and the server-side check fails
// open, so forms keep working until keys are added in Vercel.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type TurnstileAPI = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export default function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onVerify)
  callbackRef.current = onVerify
  const renderedRef = useRef(false)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    const render = () => {
      if (cancelled || renderedRef.current) return
      const api = window.turnstile
      if (!api || !containerRef.current) return
      renderedRef.current = true
      api.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => callbackRef.current(token),
        'expired-callback': () => callbackRef.current(''),
        'error-callback': () => callbackRef.current(''),
      })
    }

    if (window.turnstile) {
      render()
      return
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    const poll = window.setInterval(render, 300)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      script?.removeEventListener('load', render)
    }
  }, [])

  if (!SITE_KEY) return null
  return <div ref={containerRef} className="my-4" />
}
