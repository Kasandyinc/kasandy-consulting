interface PageHeroProps {
  image?: string
  label: string
  title?: string
  titleHtml?: string   // supports <em> for italic red emphasis
  subtitle?: string
  position?: string
  dark?: boolean       // true = dark bg (for services/resources with no photo)
}

export default function PageHero({
  image,
  label,
  title,
  titleHtml,
  subtitle,
  position = 'object-center',
  dark = false,
}: PageHeroProps) {
  const hasPhoto = image && image.length > 0

  return (
    <section
      className={`relative h-[56vh] min-h-[400px] flex items-end overflow-hidden
        ${hasPhoto ? '' : dark ? 'bg-kc-black' : 'bg-kc-cream'}`}
    >
      {hasPhoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${position}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-kc-black/85 via-kc-black/40 to-kc-black/10" />
        </>
      )}

      <div className={`relative max-w-7xl mx-auto w-full px-6 pb-14 ${!hasPhoto ? 'pt-20' : ''}`}>
        <span className={`section-label ${hasPhoto ? 'text-white/70' : 'text-kc-brown'}`}>
          {label}
        </span>

        {titleHtml ? (
          <h1
            className={`font-display text-5xl md:text-6xl lg:text-7xl font-light leading-tight
              [&_em]:not-italic [&_em]:text-kc-red
              ${hasPhoto ? 'text-white' : 'text-kc-black'}`}
            dangerouslySetInnerHTML={{ __html: titleHtml }}
          />
        ) : (
          <h1
            className={`font-display text-5xl md:text-6xl lg:text-7xl font-light leading-tight text-balance
              ${hasPhoto ? 'text-white' : 'text-kc-black'}`}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            className={`font-sans text-base max-w-2xl mt-4 leading-relaxed
              ${hasPhoto ? 'text-white/75' : 'text-kc-brown/80'}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
