export type SpeakingPhoto = {
  id: string
  src: string
  alt: string
  caption?: string
  event?: string
}

export type SpeakingVideo = {
  id: string
  embedUrl: string
  title: string
  event?: string
  thumbnail?: string
}

export type SpeakingQuote = {
  id: string
  quote: string
  name: string
  title: string
  organisation: string
}

export const speakingPhotos: SpeakingPhoto[] = []
export const speakingVideos: SpeakingVideo[] = []
export const speakingQuotes: SpeakingQuote[] = []
