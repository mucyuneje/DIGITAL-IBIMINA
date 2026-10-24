'use client'

import { PublicOnly } from '@/components/guards'
import { Create } from '@/screens/welcome/Create'

export default function Page() {
  return (
    <PublicOnly>
      <Create />
    </PublicOnly>
  )
}
