'use client'

import { useEffect, useState } from 'react'

type Photo = { id: string; src: string; alt: string; caption?: string; event?: string }
type Video = { id: string; embedUrl: string; title: string; event?: string }

// Static gallery — always shown as base; admin photos prepend when available
const FALLBACK_PHOTOS: Photo[] = [
  { id: 'f1', src: '/images/jackee-speaking-1.jpg', alt: 'Jackee Kasandy speaking on stage' },
  { id: 'f2', src: '/images/jackee-speaking-2.jpg', alt: 'Jackee Kasandy keynote presentation' },
  { id: 'f3', src: '/images/jackee-speaking-3.jpg', alt: 'Jackee Kasandy at conference' },
  { id: 'f4', src: '/images/jackee-workshop-1.jpg', alt: 'Jackee Kasandy workshop session' },
  { id: 'f5', src: '/images/gallery-2.jpg',         alt: 'Kasandy Consulting event' },
  { id: 'f6', src: '/images/gallery-5.jpg',         alt: 'Kasandy Consulting event' },
  { id: 'f7', src: '/images/gallery-8.jpg',         alt: 'Kasandy Consulting event' },
  { id: 'f8', src: '/images/gallery-11.jpg',        alt: 'Kasandy Consulting event' },
  { id: 'f9', src: '/images/gallery-14.jpg',        alt: 'Kasandy Consulting event' },
]

export default function SpeakingMedia() {
  const [adminPhotos, setAdminPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/speaking/photos').then(r => r.json()).catch(() => []),
      fetch('/api/admin/speaking/videos').then(r => r.json()).catch(() => []),
    ]).then(([p, v]) => {
      setAdminPhotos(Array.isArray(p) ? p : [])
      setVideos(Array.isArray(v) ? v : [])
    })
  }, [])

  // Admin photos shown first; fallbacks always fill in behind
  const allPhotos = adminPhotos.length > 0
    ? [...adminPhotos, ...FALLBACK_PHOTOS.filter(f => !adminPhotos.some(a => a.src === f.src))]
    : FALLBACK_PHOTOS

  const displayPhotos = allPhotos.filter(p => !hiddenIds.has(p.id))

  const hidePhoto = (id: string) =>
    setHiddenIds(prev => { const next = new Set(prev); next.add(id); return next })

  return (
    <section className="py-20 px-6 bg-kc-gray-light">
      <div className="max-w-7xl mx-auto">
        <span className="section-label">Gallery</span>
        <h2 className="section-heading mb-12">On Stage</h2>

        {/* Photo grid — mixed sizes for visual interest */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {displayPhotos.map((p, i) => (
            <div
              key={p.id}
              className={`overflow-hidden bg-kc-charcoal relative group
                ${i === 0 ? 'col-span-2 md:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}
              `}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={() => hidePhoto(p.id)}
              />
              {(p.caption || p.event) && (
                <div className="absolute inset-0 bg-gradient-to-t from-kc-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end px-4 py-4">
                  {p.event && <p className="font-sans text-[10px] tracking-widest uppercase text-white/70 mb-0.5">{p.event}</p>}
                  {p.caption && <p className="font-sans text-xs text-white">{p.caption}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Video section — only shown when admin has added videos */}
        {videos.length > 0 && (
          <div className="mt-16">
            <p className="font-sans text-xs tracking-widest uppercase text-kc-gray-mid mb-6">Video</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {videos.map(v => (
                <div key={v.id}>
                  <div className="aspect-video bg-kc-black overflow-hidden">
                    <iframe
                      src={v.embedUrl}
                      title={v.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="font-sans text-sm text-kc-black mt-3">{v.title}</p>
                  {v.event && <p className="font-sans text-xs text-kc-gray-mid mt-1">{v.event}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
