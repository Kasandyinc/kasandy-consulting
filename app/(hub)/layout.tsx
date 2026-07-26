import type { Metadata } from 'next'
import './globals.css'

// The hub's own root layout — deliberately isolated from the marketing shell:
// no GA4, no Meta Pixel, no external fonts, no public Nav/Footer. noindex.
export const metadata: Metadata = {
  title: 'Kasandy Engine',
  robots: { index: false, follow: false },
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  )
}
