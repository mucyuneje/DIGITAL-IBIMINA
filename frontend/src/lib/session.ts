import { authLayer } from '@/services'

export type SessionOutcome = 'member' | 'no-account' | 'anonymous'

/**
 * After OTP confirmation the session may arrive asynchronously (Firebase Auth
 * notifies listeners on its own tick). Wait briefly instead of guessing, so a
 * returning member is never bounced into the Join screen.
 */
export async function waitForSession(timeoutMs = 4000): Promise<SessionOutcome> {
  const step = 100
  for (let waited = 0; waited <= timeoutMs; waited += step) {
    if (authLayer.getState().session) return 'member'
    if (waited >= timeoutMs) break
    await new Promise((resolve) => window.setTimeout(resolve, step))
  }
  const finalState = authLayer.getState()
  if (finalState.session) return 'member'
  return finalState.verifiedPhone ? 'no-account' : 'anonymous'
}
