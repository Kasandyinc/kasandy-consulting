'use client'

import { useState } from 'react'

/**
 * settings.signature_logo_url, rendered as a real image — with the text wordmark as
 * a fallback for an empty or broken URL, never as the default.
 *
 * The empty-URL case is a plain server-side check the parent can make without this
 * file. What needs a client component is the broken-URL case: an <img> that fails to
 * load only reports that via the onerror DOM event, which a Server Component cannot
 * observe. So this is the smallest slice of the document that has to run client-side
 * — everything else in ProposalDocument stays a plain, server-renderable component.
 */
export default function ProposalLogo({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false)

  if (!url?.trim() || broken) {
    return <p className="kc-doc__wordmark">Kasandy Consulting</p>
  }

  return (
    <img
      className="kc-doc__logo"
      src={url}
      alt="Kasandy Consulting"
      // Explicit attributes, not just the CSS box — the same reasoning
      // lib/engine/signature.ts uses for this identical file: some renderers draw
      // an <img> at its native size (500×500) until width/height say otherwise.
      width={84}
      height={84}
      onError={() => setBroken(true)}
    />
  )
}
