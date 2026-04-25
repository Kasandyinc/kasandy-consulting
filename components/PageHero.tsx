interface PageHeroProps {
  image: string
  label: string
  title: string
  subtitle?: string
  position?: string
}

export default function PageHero({ image, label, title, subtitle, position = 'object-center' }: PageHeroProps) {
  return (
    <section className="relative h-[52vh] min-h-[380px] flex items-end overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className={`absolute inset-0 w-full h-full object-cover ${position}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-kc-black/80 via-kc-black/40 to-kc-black/10" />
      <div className="relative max-w-7xl mx-auto w-full px-6 pb-12">
        <span className="section-label text-kc-brown">{label}</span>
        <h1 className="font-display text-5xl md:text-6xl font-light text-white leading-tight text-balance">{title}</h1>
        {subtitle && (
          <p className="font-sans text-base text-white/75 max-w-2xl mt-4 leading-relaxed">{subtitle}</p>
        )}
      </div>
    </section>
  )
}
