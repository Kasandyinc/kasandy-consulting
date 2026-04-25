import Link from 'next/link'
import { Linkedin, Instagram, MessageCircle, ArrowRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-kc-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-white/10">

          {/* Col 1 — Brand */}
          <div>
            <div className="font-display text-xl tracking-[0.18em] uppercase mb-3">
              K<span className="text-kc-red">A</span>SANDY <span className="text-white/50 font-light">CONSULTING</span>
            </div>
            <p className="font-display text-lg italic text-white/60 mb-4">Where Ambition Meets Access.</p>
            <p className="font-sans text-xs text-white/50 leading-relaxed">
              Black women-owned consulting, advisory, and training firm.<br />Vancouver, BC, Canada.
            </p>
          </div>

          {/* Col 2 — Services */}
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-4">Services</p>
            <ul className="space-y-2.5">
              {[
                ['Entrepreneurs & Founders', '/entrepreneurs'],
                ['Government & Public Sector', '/government'],
                ['Non-Profit Organizations', '/nonprofits'],
                ['Kenya & International', '/kenya'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="font-sans text-xs text-white/60 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Company */}
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-4">Company</p>
            <ul className="space-y-2.5">
              {[
                ['About', '/about'],
                ['Work & Results', '/work'],
                ['Speaking', '/speaking'],
                ['Press & Media', '/press'],
                ['Resources', '/resources'],
                ['Contact', '/contact'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="font-sans text-xs text-white/60 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Connect */}
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-4">Connect</p>
            <Link href="/contact"
              className="flex items-center gap-2 font-sans text-xs text-white border border-white/20 px-4 py-3 hover:bg-white hover:text-kc-black transition-colors mb-5">
              <ArrowRight size={13} /> Send a Message
            </Link>
            <ul className="space-y-3">
              <li>
                <a href="https://www.linkedin.com/in/jackeekasandy" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-sans text-xs text-white/60 hover:text-white transition-colors">
                  <Linkedin size={13} /> LinkedIn
                </a>
              </li>
              <li>
                <a href="https://instagram.com/kasandyinc" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-sans text-xs text-white/60 hover:text-white transition-colors">
                  <Instagram size={13} /> Instagram
                </a>
              </li>
              <li>
                <a href="https://wa.me/17783854480" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-sans text-xs text-white/60 hover:text-white transition-colors">
                  <MessageCircle size={13} /> WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-sans text-[10px] text-white/40 tracking-wide">
            BEBC Society Certified &nbsp;|&nbsp; WBE Pending &nbsp;|&nbsp; Women Led &amp; Owned &nbsp;|&nbsp; Black-Owned Business
          </p>
          <p className="font-sans text-[10px] text-white/40">
            © {new Date().getFullYear()} Kasandy Consulting. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
