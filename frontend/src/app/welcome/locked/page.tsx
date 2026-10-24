'use client'

import { Suspense } from 'react'
import { Locked } from '@/screens/welcome/Locked'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Locked />
    </Suspense>
  )
}
