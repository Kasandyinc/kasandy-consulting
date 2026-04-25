import siteSettings from './siteSettings'
import homePage from './homePage'
import aboutPage from './aboutPage'
import entrepreneursPage from './entrepreneursPage'
import governmentPage from './governmentPage'
import nonprofitsPage from './nonprofitsPage'
import kenyaPage from './kenyaPage'
import speakingPage from './speakingPage'
import workPage from './workPage'
import pressPage from './pressPage'
import servicesPage from './servicesPage'
import contactPage from './contactPage'
import testimonial from './testimonial'
import pressItem from './pressItem'
import resource from './resource'

export const schemaTypes = [
  // Singletons (one document per type)
  siteSettings,
  homePage,
  aboutPage,
  entrepreneursPage,
  governmentPage,
  nonprofitsPage,
  kenyaPage,
  speakingPage,
  workPage,
  pressPage,
  servicesPage,
  contactPage,
  // Lists
  testimonial,
  pressItem,
  resource,
]
