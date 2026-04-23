'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, Play } from 'lucide-react'

type Photo = { id: string; src: string; alt: string; caption?: string; event?: string }
type Video = { id: string; embedUrl: string; title: string; event?: string }

export default function SpeakingMedia() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])

  useEffect(() => {
    fetch('/api/admin/speaking/photos').then(r => r.json()).then(setPhotos).catch(() => {})
    fetch('/api/admin/speaking/videos').then(r => r.json()).then(setVideos).catch(() => {})
  }, [])

  const hasContent = photos.length > 0 || videos.length > 0

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <span className="section-label">Gallery</span>
        <h2 className="section-heading mb-12">On Stage</h2>

        {!hasContent && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="aspect-[4/3] border border-dashed border-kc-gray-border bg-kc-gray-light flex flex-col items-center justify-center gap-3">
              <ImageIcon size={28} className="text-kc-gray-mid" />
              <p className="font-sans text-xs text-kc-gray-mid text-center px-4">Speaking Photos — managed via Admin</p>
            </div>
            <div className="aspect-[4/3] border border-dashed border-kc-gray-border bg-kc-gray-light flex flex-col items-center justify-center gap-3">
              <ImageIcon size={28} className="text-kc-gray-mid" />
              <p className="font-sans text-xs text-kc-gray-mid text-center px-4">Speaking Photos — managed via Admin</p>
            </div>
            <div className="aspect-[4/3] border border-dashed border-kc-gray-border bg-kc-gray-light flex flex-col items-center justify-center gap-3">
              <Play size={28} className="text-kc-gray-mid" />
              <p className="font-sans text-xs text-kc-gray-mid text-center px-4">Video Embeds — managed via Admin</p>
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mb-12">
            <p className="font-sans text-xs tracking-widest uppercase text-kc-gray-mid mb-6">Photos</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map(p => (
                <div key={p.id} className="group aspect-[4/3] overflow-hidden bg-kc-gray-light relative">
                  <img src={p.src} alt={p.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {(p.caption || p.event) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-kc-black/60 px-4 py-3">
                      {p.event && <p className="font-sans text-[10px] tracking-wide uppercase text-white/60 mb-0.5">{p.event}</p>}
                      {p.caption && <p className="font-sans text-xs text-white">{p.caption}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div>
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
