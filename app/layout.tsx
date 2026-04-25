import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const GA4_ID        = process.env.NEXT_PUBLIC_GA4_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export const metadata: Metadata = {
  metadataBase: new URL('https://kasandyconsulting.com'),
  title: {
    default: 'Kasandy Consulting | Where Ambition Meets Access',
    template: '%s | Kasandy Consulting',
  },
  description: 'Procurement strategy, business coaching, non-profit transformation, and Canadian market entry programs. Led by Jackee Kasandy — creator of Canada\'s first procurement readiness course.',
  keywords: [
    'procurement readiness training Canada', 'business coach Black entrepreneurs',
    'supplier diversity certification Canada', 'how to win government contracts Canada',
    'Indigenous procurement training Canada', 'non-profit strategic planning consultant Canada',
    'Kenya Canada market entry', 'Jackee Kasandy', 'BEBC Society',
  ],
  authors: [{ name: 'Kasandy Consulting', url: 'https://kasandyconsulting.com' }],
  creator: 'Kasandy Consulting',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://kasandyconsulting.com',
    siteName: 'Kasandy Consulting',
    title: 'Kasandy Consulting — Where Ambition Meets Access',
    description: 'Procurement strategy, business coaching, and market entry programs. Led by Jackee Kasandy — designer of Canada\'s first procurement readiness course.',
    images: [{ url: '/images/hero-1.jpg', width: 1200, height: 630, alt: 'Kasandy Consulting' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kasandy Consulting — Where Ambition Meets Access',
    description: 'Procurement strategy, business coaching, and market entry programs.',
    images: ['/images/hero-1.jpg'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: 'https://kasandyconsulting.com' },
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {GA4_ID && (
          <>
            <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} />
            <Script id="ga4-config" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
            </Script>
          </>
        )}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
        )}
        <Script id="ld-organization" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://kasandyconsulting.com/#organization',
                name: 'Kasandy Consulting',
                url: 'https://kasandyconsulting.com',
                logo: 'https://kasandyconsulting.com/images/kc-logo.png',
                description: 'Procurement strategy, business coaching, non-profit transformation, and Canadian market entry programs.',
                address: { '@type': 'PostalAddress', addressLocality: 'Vancouver', addressRegion: 'BC', addressCountry: 'CA' },
                founder: { '@type': 'Person', name: 'Jackee Kasandy' },
                sameAs: ['https://www.linkedin.com/company/kasandy-consulting'],
              },
              {
                '@type': 'Person',
                '@id': 'https://kasandyconsulting.com/#jackee',
                name: 'Jackee Kasandy',
                jobTitle: 'Founder & Principal Consultant',
                worksFor: { '@id': 'https://kasandyconsulting.com/#organization' },
                url: 'https://kasandyconsulting.com/about',
                description: 'Canada\'s leading procurement strategist and business coach. Creator of Canada\'s first national procurement readiness course.',
                knowsAbout: ['Procurement Strategy', 'Supplier Diversity', 'Business Coaching', 'Non-Profit Strategy'],
                address: { '@type': 'PostalAddress', addressLocality: 'Vancouver', addressRegion: 'BC', addressCountry: 'CA' },
              },
            ],
          })}
        </Script>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
