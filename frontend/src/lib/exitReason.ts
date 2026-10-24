/** Why a member was returned to a pre-auth screen. Display routing only — it never influences verification. */
export type ExitReason = 'idle'

let current: ExitReason | null = null
const listeners = new Set<() => void>()

export function setExitReason(reason: ExitReason | null): void {
  current = reason
  listeners.forEach((notify) => notify())
}

export function readExitReason(): ExitReason | null {
  return current
}

export function subscribeExitReason(notify: () => void): () => void {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}
