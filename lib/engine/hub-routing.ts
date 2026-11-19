/**
 * Who may be where on the hub host.
 *
 * This existed as three `if` statements in middleware.ts, and the order between them
 * was load-bearing in a way nothing stated. The first refused anyone who was not an
 * operator unless they were already on the portal; the third said where a signed-in
 * non-operator should go instead. A client on '/' matched the first, so the third
 * could never run — the rule was correct, was written, and was unreachable. The
 * client it was written for got "That email isn't authorized for the Engine."
 *
 * So the decision is one function with one return, exhaustively exercised in
 * lib/regression.test.ts. A middleware `if` ladder cannot be tested without a request,
 * a host and a Supabase session; this can be asked about every combination that
 * matters, which is how the shadowed branch gets caught next time.
 *
 * Membership is deliberately not an input. Whether a signed-in address belongs to an
 * engagement is RLS's decision, made in the database on every row the portal reads; a
 * stranger who signs in reaches the portal's empty state, not anyone's data. Asking
 * here would mean a round-trip in middleware and a second place for that rule to
 * drift — which is the defect this file exists to stop repeating.
 */

export type HubViewer = {
  /** A session was established and carries an email address. */
  signedIn: boolean
  /** That address is on ENGINE_OPERATOR_EMAILS. */
  isOperator: boolean
}

export type HubRoute =
  /** Let the request through to the hub's own tree. */
  | { kind: 'allow' }
  /** Send the browser somewhere it is allowed to be. */
  | { kind: 'redirect'; to: '/' | '/login' | '/portal' }
  /**
   * The auth callback: a route handler that completes a sign-in and chooses its own
   * destination. Redirecting it means the session is never established at all, so it
   * is separated from 'allow' to make that non-negotiable rather than incidental.
   */
  | { kind: 'passthrough' }

export const LOGIN_PATH = '/login'

export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/')
}

export function isPortalPath(pathname: string): boolean {
  return pathname === '/portal' || pathname.startsWith('/portal/')
}

/**
 * The single statement of the rule.
 *
 * Order inside this function is still order, but it is now order in one place over
 * one set of inputs, and every path through it is asserted.
 */
export function hubRoute(pathname: string, viewer: HubViewer): HubRoute {
  // Finishing a sign-in comes before every question about who you are, because until
  // it has run there is no answer to that question.
  if (isAuthCallbackPath(pathname)) return { kind: 'passthrough' }

  const onLogin = pathname === LOGIN_PATH

  // Nobody signed in: the login page is the only thing to see.
  if (!viewer.signedIn) {
    return onLogin ? { kind: 'allow' } : { kind: 'redirect', to: LOGIN_PATH }
  }

  // An operator goes anywhere, and should not sit on a sign-in screen.
  if (viewer.isOperator) {
    return onLogin ? { kind: 'redirect', to: '/' } : { kind: 'allow' }
  }

  // Everyone else signed in is a client, and the portal is where a client lives.
  // The login page is included: arriving there already signed in is the exact state
  // the old ordering left Khadija in, signed in and looking at a sign-in form.
  return isPortalPath(pathname) ? { kind: 'allow' } : { kind: 'redirect', to: '/portal' }
}
