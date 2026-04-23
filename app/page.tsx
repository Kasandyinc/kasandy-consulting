export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black/8">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span
            className="font-display text-xl tracking-[0.25em] uppercase"
            style={{ letterSpacing: '0.2em' }}
          >
            K<span className="text-[#C41230]">A</span>SANDY CONSULTING
          </span>
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase font-sans font-medium">
            <a href="#about"    className="hover:text-[#C41230] transition-colors">About</a>
            <a href="#services" className="hover:text-[#C41230] transition-colors">Services</a>
            <a href="#work"     className="hover:text-[#C41230] transition-colors">Work</a>
            <a href="#contact"  className="hover:text-[#C41230] transition-colors">Contact</a>
          </nav>
          <a
            href="#contact"
            className="hidden md:inline-flex items-center px-5 py-2 border border-[#0A0A0A] text-xs tracking-widest uppercase font-sans font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
          >
            Work With Us
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-16 min-h-screen flex flex-col items-center justify-center text-center px-6">
        {/* Logo placeholder — replace /images/kc-logo.png with your file */}
        <div className="mb-10">
          <img
            src="/images/kc-logo.png"
            alt="Kasandy Consulting"
            className="h-32 w-auto mx-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        <p className="font-sans text-xs tracking-[0.35em] uppercase text-[#9A9189] mb-6">
          — Coming Soon —
        </p>
        <h1 className="font-display text-5xl md:text-7xl font-light leading-tight text-balance mb-6">
          {/* Hero headline — add your copy here */}
          Strategy. Purpose.<br />Impact.
        </h1>
        <p className="font-sans text-base md:text-lg text-[#3C3835] max-w-xl mx-auto mb-10 leading-relaxed">
          {/* Subheadline — add your copy here */}
          Placeholder — your content coming soon.
        </p>
        <a
          href="#contact"
          className="inline-flex items-center px-8 py-4 bg-[#0A0A0A] text-white text-xs tracking-[0.2em] uppercase font-sans font-medium hover:bg-[#C41230] transition-colors"
        >
          Let&apos;s Talk
        </a>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 px-6 bg-[#F8F4EF]">
        <div className="max-w-4xl mx-auto">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-[#C41230] mb-4">About</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-8">
            {/* Section heading — add your copy */}
            About Kasandy Consulting
          </h2>
          <p className="font-sans text-base text-[#3C3835] leading-relaxed max-w-2xl">
            {/* Body copy — add your content */}
            Placeholder — your about section content coming soon.
          </p>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-[#C41230] mb-4">Services</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-16">
            {/* Section heading */}
            What We Offer
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Service cards — replace with real services */}
            {['Service One', 'Service Two', 'Service Three'].map((s) => (
              <div key={s} className="border border-black/10 p-8">
                <h3 className="font-display text-2xl font-light mb-3">{s}</h3>
                <p className="font-sans text-sm text-[#9A9189] leading-relaxed">
                  Description placeholder — add your content.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Work / Clients ── */}
      <section id="work" className="py-24 px-6 bg-[#0A0A0A] text-white">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-[#C41230] mb-4">Work</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-16">
            {/* Section heading */}
            Featured Work
          </h2>
          <p className="font-sans text-base text-white/60 max-w-2xl">
            Placeholder — add client logos, case studies, or testimonials here.
          </p>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-[#C41230] mb-4">Contact</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-6">
            Let&apos;s Work Together
          </h2>
          <p className="font-sans text-base text-[#3C3835] mb-12">
            {/* CTA copy — add your content */}
            Placeholder — your contact copy coming soon.
          </p>
          <a
            href="mailto:jackee@kasandyconsulting.com"
            className="inline-flex items-center px-10 py-4 bg-[#0A0A0A] text-white text-xs tracking-[0.2em] uppercase font-sans font-medium hover:bg-[#C41230] transition-colors"
          >
            Get In Touch
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#9A9189] tracking-wide font-sans">
          <span>
            © {new Date().getFullYear()} K<span className="text-[#C41230]">A</span>SANDY CONSULTING
          </span>
          <span>Vancouver, BC</span>
        </div>
      </footer>

    </div>
  )
}
