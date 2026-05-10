import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Kasandy Consulting',
  description: 'Terms and conditions for Kasandy Consulting services and digital products.',
}

const LAST_UPDATED = 'May 2026'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="font-display text-2xl font-bold text-kc-charcoal mb-4 pb-3 border-b border-kc-gray-border">
        {title}
      </h2>
      <div className="font-sans text-[15px] leading-[1.8] text-kc-text-mid space-y-4">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="pt-16 min-h-screen bg-kc-warm-white">

      {/* Hero */}
      <div className="bg-kc-black text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Legal</span>
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
          </div>
          <h1 className="font-display font-bold text-white leading-[1.08] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(32px,4vw,52px)' }}>
            Terms &amp; Conditions
          </h1>
          <p className="font-sans text-sm text-white/50 mt-4">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Table of contents */}
        <nav className="bg-white border border-kc-gray-border p-6 mb-12">
          <p className="font-mono text-[10px] tracking-widest uppercase text-kc-brown mb-4">Contents</p>
          <ol className="space-y-2">
            {[
              ['1', 'General Terms', '#general'],
              ['2', 'Services', '#services'],
              ['3', 'Digital Products — Licence Terms', '#digital-products'],
              ['4', 'Intellectual Property & Copyright', '#intellectual-property'],
              ['5', 'Forensic Identification', '#forensic'],
              ['6', 'Payment & Refunds', '#payment'],
              ['7', 'Limitation of Liability', '#liability'],
              ['8', 'Privacy', '#privacy'],
              ['9', 'Governing Law', '#governing-law'],
              ['10', 'Contact', '#contact'],
            ].map(([num, label, href]) => (
              <li key={href} className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-kc-brown w-4 flex-shrink-0">{num}.</span>
                <a href={href} className="font-sans text-sm text-kc-charcoal hover:text-kc-brown transition-colors">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="general" title="1. General Terms">
          <p>
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your use of the website kasandyconsulting.com and all services and digital products offered by Kasandy Consulting Inc. (&ldquo;Kasandy Consulting,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a company incorporated in British Columbia, Canada.
          </p>
          <p>
            By accessing this website, engaging our services, or purchasing any digital product, you agree to be bound by these Terms. If you do not agree, do not use this website or purchase our products.
          </p>
          <p>
            We reserve the right to update these Terms at any time. The date of the most recent revision appears at the top of this page. Continued use of the site following any update constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section id="services" title="2. Services">
          <p>
            Kasandy Consulting provides procurement strategy consulting, business coaching, non-profit advisory, and Canadian market entry services. Services are delivered under separate engagement agreements or statements of work, which govern that specific engagement.
          </p>
          <p>
            Nothing on this website constitutes legal, financial, or accounting advice. All consulting services are general business advisory in nature. Clients are responsible for engaging qualified legal, financial, or regulatory counsel for matters requiring such expertise.
          </p>
          <p>
            Kasandy Consulting reserves the right to decline any engagement at its sole discretion.
          </p>
        </Section>

        <Section id="digital-products" title="3. Digital Products — Licence Terms">
          <p className="font-semibold text-kc-charcoal">
            Digital products sold through this website are licensed, not sold.
          </p>
          <p>
            Purchase of any digital product from kasandyconsulting.com grants you a <strong className="text-kc-charcoal">personal, non-transferable, non-exclusive licence</strong> for individual business use by the original purchaser only. This licence does not transfer with the product to any other person or entity.
          </p>
          <p>
            Under this licence, you may:
          </p>
          <ul className="list-none space-y-2 pl-0">
            {[
              'Use the product for your own business planning and strategy',
              'Generate outputs and download them as PDF documents for your personal use',
              'Share your generated PDF outputs with colleagues within your own organisation',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-kc-brown font-bold mt-1 flex-shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Under this licence, you may <strong className="text-kc-charcoal">not</strong>:
          </p>
          <ul className="list-none space-y-2 pl-0">
            {[
              'Reproduce, copy, or redistribute the product or any part of it',
              'Resell, sublicense, or make the product available to third parties',
              'Use the product to deliver consulting or advisory services to third parties for commercial gain',
              'Share your access link or login credentials with others',
              'Remove, obscure, or circumvent any copyright notices, watermarks, or licence identifiers embedded in the product',
              'Use the product or its outputs to train AI models or similar systems',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-kc-brown font-bold mt-1 flex-shrink-0">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Reproduction, redistribution, resale, sublicensing, or commercial use of any digital product without the prior written permission of Kasandy Consulting Inc. constitutes copyright infringement under the <em>Copyright Act</em> (R.S.C., 1985, c. C-42).
          </p>
          <p>
            Access links for paid products expire after 7 days and are limited to 10 uses per purchase. If you require extended access, contact us at{' '}
            <a href="mailto:consulting@kasandy.com" className="text-kc-brown hover:underline">consulting@kasandy.com</a>.
          </p>
        </Section>

        <Section id="intellectual-property" title="4. Intellectual Property &amp; Copyright">
          <p>
            All content on this website — including text, graphics, logos, product designs, and digital products — is the property of Kasandy Consulting Inc. and is protected by Canadian and international copyright law.
          </p>
          <p>
            Kasandy Consulting&trade; is a trademark of Kasandy Consulting Inc. Use of any Kasandy Consulting trademark, logo, or trade name without prior written permission is prohibited.
          </p>
          <p>
            Kasandy Consulting reserves the right to pursue all available legal remedies for infringement, including:
          </p>
          <ul className="list-none space-y-2 pl-4">
            {[
              'Injunctive relief to halt unauthorised use',
              'Statutory damages of up to $20,000 CAD per infringement for commercial infringement under the Copyright Act',
              'Actual damages and lost profits',
              'Legal costs and disbursements',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-kc-brown mt-1 flex-shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="forensic" title="5. Forensic Identification">
          <p>
            Each digital product and every PDF document generated through our platform contains a unique forensic reference identifier (&ldquo;Forensic ID&rdquo;). This identifier is embedded in the document content, metadata, and generated outputs.
          </p>
          <p>
            Kasandy Consulting may use this identifier to trace any copy of a generated document to the original purchaser. In the event of suspected infringement, the Forensic ID constitutes evidence of the identity of the original purchaser and is admissible in legal proceedings.
          </p>
          <p>
            By purchasing a digital product, you acknowledge and consent to the embedding of this forensic identifier in all documents you generate using the product.
          </p>
        </Section>

        <Section id="payment" title="6. Payment &amp; Refunds">
          <p>
            All prices are listed in Canadian dollars (CAD) unless otherwise stated. Payments are processed securely by Square. Kasandy Consulting does not store payment card information.
          </p>
          <p>
            <strong className="text-kc-charcoal">Digital products are non-refundable</strong> once access has been granted or the product has been opened. This policy exists because digital products are immediately accessible upon purchase and cannot be &ldquo;returned.&rdquo;
          </p>
          <p>
            If you experience a technical issue that prevents you from accessing your purchased product, contact us within 14 days of purchase at{' '}
            <a href="mailto:consulting@kasandy.com" className="text-kc-brown hover:underline">consulting@kasandy.com</a>{' '}
            and we will work to resolve the issue or provide an alternative remedy.
          </p>
          <p>
            For consulting services, payment terms and cancellation policies are defined in the applicable engagement agreement or statement of work.
          </p>
        </Section>

        <Section id="liability" title="7. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, Kasandy Consulting Inc. and its directors, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of this website, our services, or our digital products.
          </p>
          <p>
            Our total liability to you for any claim arising from your use of our products or services shall not exceed the amount you paid for the specific product or service giving rise to the claim.
          </p>
          <p>
            Digital products are provided &ldquo;as is.&rdquo; While we make every effort to ensure accuracy and quality, we do not warrant that any product will meet your specific business requirements or produce specific outcomes.
          </p>
        </Section>

        <Section id="privacy" title="8. Privacy">
          <p>
            We collect your name, email address, and purchase information when you engage with our services or purchase digital products. This information is used to deliver your purchase, send you product updates, and communicate with you about our services.
          </p>
          <p>
            We do not sell your personal information to third parties. We use Resend for email delivery and Square for payment processing — each governed by their own privacy policies.
          </p>
          <p>
            Purchase records, including your email address and download activity, are retained for up to 12 months for forensic and customer service purposes.
          </p>
          <p>
            You may request deletion of your personal data by contacting{' '}
            <a href="mailto:consulting@kasandy.com" className="text-kc-brown hover:underline">consulting@kasandy.com</a>.
            Note that forensic identifiers embedded in downloaded documents cannot be removed after the fact.
          </p>
        </Section>

        <Section id="governing-law" title="9. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with the laws of the Province of British Columbia and the federal laws of Canada applicable therein, without regard to conflict of law principles.
          </p>
          <p>
            Any dispute arising from these Terms or your use of our website, services, or products shall be subject to the exclusive jurisdiction of the courts of British Columbia, Canada.
          </p>
        </Section>

        <Section id="contact" title="10. Contact">
          <p>
            For questions about these Terms, licensing inquiries, or to report suspected infringement, contact:
          </p>
          <div className="bg-white border border-kc-gray-border p-6 not-prose">
            <p className="font-display text-lg font-bold text-kc-charcoal mb-1">Kasandy Consulting Inc.</p>
            <p className="font-sans text-sm text-kc-text-mid">Vancouver, British Columbia, Canada</p>
            <p className="font-sans text-sm mt-3">
              <a href="mailto:consulting@kasandy.com" className="text-kc-brown hover:underline">consulting@kasandy.com</a>
            </p>
            <p className="font-sans text-sm">
              <Link href="/contact" className="text-kc-brown hover:underline">kasandyconsulting.com/contact</Link>
            </p>
          </div>
        </Section>

      </div>
    </div>
  )
}
