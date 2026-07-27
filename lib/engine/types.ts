export const STAGES = [
  '0_unverified',
  '1_verified',
  '2_researched',
  '3_packaged',
  '4_sent',
  '5_opened',
  '6_meeting_booked',
  '7_meeting_done',
  '8_won',
  '9_disqualified',
] as const

export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  '0_unverified': 'Unverified',
  '1_verified': 'Verified',
  '2_researched': 'Researched',
  '3_packaged': 'Packaged',
  '4_sent': 'Sent',
  '5_opened': 'Opened',
  '6_meeting_booked': 'Meeting booked',
  '7_meeting_done': 'Meeting done',
  '8_won': 'Won',
  '9_disqualified': 'Disqualified',
}

/** Columns shown on the funnel board (the live part of the ladder). */
export const BOARD_STAGES: Stage[] = [
  '2_researched',
  '3_packaged',
  '4_sent',
  '5_opened',
  '6_meeting_booked',
]

export type Org = {
  id: string
  num: number | null
  name: string
  segment: string | null
  province: string | null
  city: string | null
  website: string | null
  why_fit: string | null
  leader_name: string | null
  leader_title: string | null
  leader_source: string | null
  leader_verified_on: string | null
  black_led: boolean
  signoff_status: 'pending' | 'approved'
  signoff_by: string | null
  signoff_at: string | null
  hold: boolean
  hold_reason: string | null
  priority: number | null
  priority_label: string | null
  tailoring_caution: string | null
  detail_hook: string | null
  detail_source: string | null
  detail_verified_on: string | null
  detail_is_general: boolean
  stage: Stage
  next_action: string | null
  notes: string | null
  grant_trigger: string | null
  trigger_source: string | null
  trigger_status: 'verified' | 'cohort' | 'refresh' | null
  angle_13: string | null
  pain_hypothesis: string | null
  updated_at: string
}

export type Contact = {
  id: string
  org_id: string
  name: string | null
  title: string | null
  email: string | null
  email_status: 'published' | 'confirmed' | 'inferred' | 'unknown'
  email_status_raw: string | null
  phone: string | null
  linkedin: string | null
  source: string | null
  verified_on: string | null
}

export type ConsentRow = {
  id: string
  org_id: string
  contact_id: string | null
  basis: string
  source_url: string | null
  recorded_on: string
  optout_at: string | null
  optout_source: string | null
}

/**
 * Why an org cannot be sent to yet. Mirrors the DB send-gate (§7.1) so the UI can
 * explain the refusal before anyone clicks. The database remains the enforcer.
 */
export function sendBlockers(org: Org, contacts: Contact[], consent: ConsentRow[]): string[] {
  const reasons: string[] = []
  if (org.hold) reasons.push(`On HOLD — ${org.hold_reason ?? 'no reason recorded'}`)
  if (org.black_led && org.signoff_status === 'pending')
    reasons.push('Black-led / Indigenous-serving — Owner sign-off required')
  if (consent.some((c) => c.optout_at)) reasons.push('Suppressed — contact opted out')
  else if (!consent.some((c) => !c.optout_at)) reasons.push('No consent basis recorded')
  if (!contacts.some((c) => c.email)) reasons.push('No route — no email address on file')
  return reasons
}
