'use client'

import { PublicOnly } from '@/components/guards'
import { Welcome } from '@/screens/welcome/Welcome'

export default function Page() {
  return (
    <PublicOnly>
      <Welcome />
    </PublicOnly>
  )
}
