/**
 * Website form definitions, editable from the hub.
 *
 * The public forms keep their hand-built layout and their spam controls — what moves
 * into the database is the *content*: labels, help text, select options, which fields
 * are required, the button wording, the thank-you message, and whether the form is open
 * at all. That is the part Jackee needs to change without waiting for a deploy.
 *
 * Every form still has a compiled default here. If Supabase is slow, unreachable, or a
 * row is missing, the form renders from the default rather than breaking — a contact
 * form that fails closed on a marketing site is worse than one running slightly stale
 * copy.
 */

export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date'

export type FormField = {
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  placeholder?: string
  order: number
}

export type FormConfig = {
  slug: string
  name: string
  description: string | null
  fields: FormField[]
  submitLabel: string
  successMessage: string
  notifyEmail: string | null
  active: boolean
}

const f = (
  key: string,
  label: string,
  type: FieldType,
  required: boolean,
  order: number,
  options?: string[],
  placeholder?: string,
): FormField => ({
  key, label, type, required, order,
  ...(options ? { options } : {}),
  ...(placeholder ? { placeholder } : {}),
})

/**
 * The compiled fallbacks. These mirror the seed in migration 6, so a fresh database and
 * an unreachable one render the same forms.
 */
export const FORM_DEFAULTS: Record<string, FormConfig> = {
  contact: {
    slug: 'contact',
    name: 'Project inquiry',
    description: 'Main contact form on /contact',
    submitLabel: 'Send Message',
    successMessage: 'Thank you for reaching out. We will be in touch within 2 business days.',
    notifyEmail: null,
    active: true,
    fields: [
      f('name', 'Full Name', 'text', true, 1, undefined, 'Your full name'),
      f('organisation', 'Organisation', 'text', false, 2, undefined, 'Company / organisation'),
      f('email', 'Email', 'email', true, 3, undefined, 'your@email.com'),
      f('phone', 'Phone (optional)', 'tel', false, 4, undefined, '+1 (604) 000-0000'),
      f('audienceType', 'I am a...', 'select', true, 5, [
        'Entrepreneur / Founder',
        'Government / Public Sector',
        'Non-Profit Organization',
        'International Business',
        'Other',
      ]),
      f('message', 'Message', 'textarea', true, 6),
      f('referral', 'How did you hear about us?', 'select', false, 7, [
        'Google / Search',
        'LinkedIn',
        'Instagram',
        'Referral from a colleague',
        'BEBC Society',
        'Procurement Assistance Canada',
        'Event / Conference',
        'Media / Press',
        'Other',
      ]),
    ],
  },
  'kenya-waitlist': {
    slug: 'kenya-waitlist',
    name: 'Kenya bootcamp waitlist',
    description: 'Registration form on /kenya',
    submitLabel: 'Join the waitlist',
    successMessage:
      'Check your inbox for a confirmation. You will be among the first to hear when the next bootcamp is confirmed — with priority registration access.',
    notifyEmail: null,
    active: true,
    fields: [
      f('name', 'Full Name', 'text', true, 1, undefined, 'Your name'),
      f('email', 'Email Address', 'email', true, 2, undefined, 'you@example.com'),
      f('phone', 'Phone / WhatsApp', 'tel', true, 3, undefined, '+254 7XX XXX XXX'),
      f('country', 'Country / City', 'text', true, 4, undefined, 'e.g. Nairobi, Kenya'),
      f('business', 'Business / Organisation', 'text', true, 5, undefined, 'Your business name & sector'),
      f('program', 'Which program interests you?', 'select', false, 6, [
        '2-Day Bootcamp (Nairobi or virtual)',
        'Accelerate — 90-Day Coaching',
        'Market Entry — 6-Month Program',
        'Not sure yet',
      ], 'Select a program…'),
      f('goals', 'What are you hoping to achieve?', 'textarea', false, 7, undefined,
        'Brief description of your goals for the Canadian market…'),
    ],
  },
  'speaking-inquiry': {
    slug: 'speaking-inquiry',
    name: 'Speaking inquiry',
    description: 'Booking form on /speaking',
    submitLabel: 'Send inquiry',
    successMessage: 'Thank you — we will respond within one business day.',
    notifyEmail: null,
    active: true,
    fields: [
      f('name', 'Your Name', 'text', true, 1, undefined, 'Full name'),
      f('email', 'Your Email', 'email', true, 2, undefined, 'your@email.com'),
      f('organisation', 'Organisation', 'text', true, 3, undefined, 'Company / organisation'),
      f('eventName', 'Event Name', 'text', true, 4),
      f('eventDate', 'Event Date', 'date', false, 5),
      f('location', 'Location', 'text', false, 6, undefined, 'City, Province / Virtual'),
      f('audienceSize', 'Audience Size', 'text', false, 7, undefined, 'e.g. 200 attendees'),
      f('format', 'Format', 'select', true, 8, [
        'Keynote (45–60 min)',
        'Panel',
        'Workshop / Masterclass (2–4 hr)',
        'Corporate Lunch & Learn',
        'Conference Breakout',
        'University / Academic Lecture',
        'Emcee / Host',
        'Other',
      ], 'Select format'),
      f('topicInterest', 'Topic Interest', 'select', false, 9, [
        'The Procurement Opportunity Nobody Talks About',
        'Supplier Diversity as Economic Strategy',
        "From Founder to Procurement-Ready — What They Don't Teach You",
        'Building for Belonging — Equity-Centred Leadership in Practice',
        'The Global Opportunity — African Businesses and the Canadian Market',
        'The Non-Profit Trap — Why Good Missions Fail and How to Break the Cycle',
        'Custom / Open to suggestions',
      ], 'Select a topic'),
      f('budget', 'Budget / Honorarium Range', 'text', false, 10, undefined, 'e.g. $3,000–$5,000, or TBD'),
      f('notes', 'Additional Notes', 'textarea', false, 11, undefined,
        'Event context, audience profile, specific session goals, logistics, etc.'),
    ],
  },
  newsletter: {
    slug: 'newsletter',
    name: 'The Kasandy Brief',
    description: 'Newsletter signup',
    submitLabel: 'Subscribe to The Kasandy Brief',
    successMessage: 'Look out for the next issue of The Kasandy Brief.',
    notifyEmail: null,
    active: true,
    fields: [f('email', 'Email', 'email', true, 1, undefined, 'your@email.com')],
  },
  reviews: {
    slug: 'reviews',
    name: 'Client review',
    description: 'Testimonial submission',
    submitLabel: 'Submit review',
    successMessage: 'Thank you — your review is pending approval.',
    notifyEmail: null,
    active: true,
    fields: [
      f('name', 'Your Name', 'text', true, 1),
      f('title', 'Title', 'text', false, 2),
      f('organisation', 'Organisation', 'text', false, 3),
      f('audience', 'Audience', 'text', false, 4),
      f('quote', 'Your review', 'textarea', true, 5),
    ],
  },
}

/** Shape a database row into a FormConfig, tolerating partial or malformed JSON. */
export function rowToConfig(row: {
  slug: string
  name: string
  description: string | null
  fields: unknown
  submit_label: string
  success_message: string
  notify_email: string | null
  active: boolean
}): FormConfig {
  const fallback = FORM_DEFAULTS[row.slug]
  const raw = Array.isArray(row.fields) ? (row.fields as Record<string, unknown>[]) : []

  const fields: FormField[] = raw
    .filter((x) => typeof x?.key === 'string' && typeof x?.label === 'string')
    .map((x, i) => ({
      key: String(x.key),
      label: String(x.label),
      type: (['text', 'email', 'tel', 'textarea', 'select', 'date'] as const).includes(x.type as FieldType)
        ? (x.type as FieldType)
        : 'text',
      required: Boolean(x.required),
      options: Array.isArray(x.options) ? x.options.map(String) : undefined,
      placeholder: typeof x.placeholder === 'string' ? x.placeholder : undefined,
      order: typeof x.order === 'number' ? x.order : i + 1,
    }))
    .sort((a, b) => a.order - b.order)

  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    // An empty field list means the row is broken, not that the form has no fields.
    fields: fields.length ? fields : (fallback?.fields ?? []),
    submitLabel: row.submit_label || fallback?.submitLabel || 'Submit',
    successMessage: row.success_message || fallback?.successMessage || 'Thank you.',
    notifyEmail: row.notify_email,
    active: row.active,
  }
}

/** Look up one field's label, falling back to the key so nothing renders blank. */
export function labelFor(config: FormConfig, key: string): string {
  return config.fields.find((x) => x.key === key)?.label ?? key
}

export function optionsFor(config: FormConfig, key: string): string[] {
  return config.fields.find((x) => x.key === key)?.options ?? []
}

export function isRequired(config: FormConfig, key: string): boolean {
  return config.fields.find((x) => x.key === key)?.required ?? false
}

/** True when the form should render at all. A retired form is hidden, not broken. */
export function isActive(config: FormConfig): boolean {
  return config.active
}
