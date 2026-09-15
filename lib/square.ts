import { SquareClient, SquareEnvironment } from 'square'

/**
 * Which Square environment this deployment talks to.
 *
 * Read from SQUARE_ENV, which is the name the brief specifies and the name that
 * matches settings.square_env in the database. SQUARE_ENVIRONMENT is still honoured
 * because that is what this file used to read and what may already be set in Vercel.
 *
 * The drift mattered: setting SQUARE_ENV=production, exactly as documented, left
 * this client on Sandbox with nothing to say so — payment links would be generated
 * against test money while the dashboard said live.
 */
const configured = (process.env.SQUARE_ENV || process.env.SQUARE_ENVIRONMENT || '')
  .trim()
  .toLowerCase()

export const squareEnvName: 'production' | 'sandbox' =
  configured === 'production' ? 'production' : 'sandbox'

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: squareEnvName === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
})
