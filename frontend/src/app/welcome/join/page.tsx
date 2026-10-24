'use client'

import { Join } from '@/screens/welcome/Join'

/**
 * Join is reachable while signed in: one phone may belong to several groups
 * (R59), so a signed-in member uses this screen to add a second membership.
 */
export default function Page() {
  return <Join />
}
