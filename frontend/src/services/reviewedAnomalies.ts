/**
 * Read access to the anomaly "reviewed" marks (P2-12).
 *
 * The demo backend persists them in localStorage, so a mark survives a
 * refresh and shows up in the other tab. The Firebase backend has no
 * collection for them yet, so it honestly reports "nothing reviewed"
 * instead of pretending the marks are stored.
 */
import { dataMode } from '@/config'
import { readReviewedAnomalies, subscribeRemoteCommits } from './demoDb'
import type { Unsubscribe } from './types'

export function loadReviewedAnomalies(): string[] {
  if (dataMode === 'firebase') return []
  try {
    return readReviewedAnomalies()
  } catch {
    return []
  }
}

/** Fires when another tab commits a change that may include a review mark. */
export function subscribeAnomalyReviews(onChange: () => void): Unsubscribe {
  if (dataMode === 'firebase') return () => {}
  return subscribeRemoteCommits(onChange)
}
