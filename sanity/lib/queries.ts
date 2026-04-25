import { groq } from 'next-sanity'

export const siteSettingsQuery = groq`*[_type == "siteSettings"][0]`

export const homePageQuery = groq`*[_type == "homePage"][0]`

export const aboutPageQuery = groq`*[_type == "aboutPage"][0]`

export const entrepreneursPageQuery = groq`*[_type == "entrepreneursPage"][0]`

export const governmentPageQuery = groq`*[_type == "governmentPage"][0]`

export const nonprofitsPageQuery = groq`*[_type == "nonprofitsPage"][0]`

export const kenyaPageQuery = groq`*[_type == "kenyaPage"][0]`

export const speakingPageQuery = groq`*[_type == "speakingPage"][0]`

export const workPageQuery = groq`*[_type == "workPage"][0]`

export const pressPageQuery = groq`*[_type == "pressPage"][0]`

export const servicesPageQuery = groq`*[_type == "servicesPage"][0]`

export const contactPageQuery = groq`*[_type == "contactPage"][0]`

export const testimonialsQuery = groq`*[_type == "testimonial" && approved == true] | order(_createdAt desc)`

export const pressItemsQuery = groq`*[_type == "pressItem"] | order(featured desc, date desc)`

export const resourcesQuery = groq`*[_type == "resource" && published == true] | order(publishedAt desc)`
