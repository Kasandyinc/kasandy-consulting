'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'

const services = [
  { label: 'Entrepreneurs & Founders', href: '/entrepreneurs' },
  { label: 'Government & Public Sector', href: '/government' },
  { label: 'Non-Profit Organizations', href: '/nonprofits' },
  { label: 'Kenya & International', href: '/kenya' },
]

export default function Nav() {
  const [open, setOpen]           = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setServicesOpen(false) }, [pathname])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-shadow bg-white ${scrolled ? 'shadow-sm' : 'border-b border-kc-gray-border'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/kc-logo.png" alt="Kasandy Consulting" className="h-9 w-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="font-display text-lg tracking-[0.18em] uppercase hidden sm:block">
            K<span className="text-kc-red">A</span>SANDY <span className="text-kc-gray-mid font-light">CONSULTING</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7 text-[11px] tracking-widest uppercase font-sans font-medium">
          <Link href="/about"    className="hover:text-kc-brown transition-colors">About</Link>

          {/* Services dropdown */}
          <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
            <button className="flex items-center gap-1 hover:text-kc-brown transition-colors">
              Services <ChevronDown size={12} className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 mt-0 w-60 bg-white border border-kc-gray-border shadow-lg py-2 z-50">
                {services.map(s => (
                  <Link key={s.href} href={s.href}
                    className="block px-5 py-2.5 text-[11px] tracking-wide font-sans font-medium text-kc-black hover:bg-kc-gray-light hover:text-kc-brown transition-colors">
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/speaking"  className="hover:text-kc-brown transition-colors">Speaking</Link>
          <Link href="/work"      className="hover:text-kc-brown transition-colors">Work</Link>
          <Link href="/press"     className="hover:text-kc-brown transition-colors">Press</Link>
          <Link href="/resources" className="hover:text-kc-brown transition-colors">Resources</Link>
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <Link href="/contact" className="btn-primary text-[11px] px-5 py-2.5">Book a Call</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-kc-gray-border">
          <nav className="px-6 py-6 flex flex-col gap-5 text-[11px] tracking-widest uppercase font-sans font-medium">
            <Link href="/about">About</Link>
            <div>
              <button onClick={() => setServicesOpen(!servicesOpen)} className="flex items-center gap-1 w-full">
                Services <ChevronDown size={12} className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesOpen && (
                <div className="mt-3 pl-4 flex flex-col gap-3">
                  {services.map(s => (
                    <Link key={s.href} href={s.href} className="text-kc-gray-mid">{s.label}</Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/speaking">Speaking</Link>
            <Link href="/work">Work</Link>
            <Link href="/press">Press</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/contact" className="btn-primary mt-2 justify-center">Book a Call</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
