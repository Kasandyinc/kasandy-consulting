import crypto from 'crypto'
import { kv } from '@vercel/kv'

export interface DownloadToken {
  token: string
  buyerEmail: string
  productSlug: string
  orderId?: string
  createdAt: number
  expiresAt: number
  usesRemaining: number
  usedAt: { at: number; sessionId: string }[]
}

const TOKEN_TTL_SECONDS = 7 * 24 * 3600 // 7 days
const MAX_USES = 10

export const FREE_SLUGS = [
  'procurement-checklist',
  'nonprofit-scorecard',
  'kenya-canada-roadmap',
]

export async function createDownloadToken(
  productSlug: string,
  buyerEmail = 'pending',
  orderId?: string,
): Promise<string> {
  const token = crypto.randomUUID()
  const now = Date.now()
  const data: DownloadToken = {
    token,
    buyerEmail,
    productSlug,
    orderId,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_SECONDS * 1000,
    usesRemaining: MAX_USES,
    usedAt: [],
  }
  await kv.set(`token:${token}`, JSON.stringify(data), { ex: TOKEN_TTL_SECONDS })
  if (orderId) {
    await kv.set(`order:${orderId}`, token, { ex: TOKEN_TTL_SECONDS })
  }
  return token
}

export async function updateTokenEmail(token: string, email: string): Promise<void> {
  const raw = await kv.get<string>(`token:${token}`)
  if (!raw) return
  try {
    const data: DownloadToken = typeof raw === 'string' ? JSON.parse(raw) : (raw as DownloadToken)
    data.buyerEmail = email
    const remaining = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000))
    await kv.set(`token:${token}`, JSON.stringify(data), { ex: remaining })
  } catch { /* ignore */ }
}

export type TokenValidation =
  | { valid: true; data: DownloadToken }
  | { valid: false; error: string; data?: DownloadToken }

export async function validateToken(
  token: string,
  productSlug?: string,
): Promise<TokenValidation> {
  let raw: unknown
  try {
    raw = await kv.get<string>(`token:${token}`)
  } catch {
    return { valid: false, error: 'Token lookup failed' }
  }
  if (!raw) return { valid: false, error: 'Token not found' }

  let data: DownloadToken
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : (raw as DownloadToken)
  } catch {
    return { valid: false, error: 'Invalid token data' }
  }

  if (Date.now() > data.expiresAt) return { valid: false, error: 'Token expired', data }
  if (data.usesRemaining <= 0) return { valid: false, error: 'Download limit reached', data }
  if (productSlug && data.productSlug !== productSlug) return { valid: false, error: 'Wrong product', data }

  return { valid: true, data }
}

export async function consumeToken(token: string, sessionId: string): Promise<void> {
  let raw: unknown
  try {
    raw = await kv.get<string>(`token:${token}`)
  } catch { return }
  if (!raw) return
  let data: DownloadToken
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : (raw as DownloadToken)
  } catch { return }

  data.usesRemaining = Math.max(0, data.usesRemaining - 1)
  data.usedAt.push({ at: Date.now(), sessionId })
  const remaining = Math.max(60, Math.floor((data.expiresAt - Date.now()) / 1000))
  await kv.set(`token:${token}`, JSON.stringify(data), { ex: remaining })
}
