/**
 * Operator allow-list. Only these emails may access the hub (Phase 1).
 * Source: env ENGINE_OPERATOR_EMAILS (comma-separated). Client roles arrive in Phase 4.
 */
export function operatorEmails(): string[] {
  return (process.env.ENGINE_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isOperator(email: string | null | undefined): boolean {
  if (!email) return false
  return operatorEmails().includes(email.trim().toLowerCase())
}
