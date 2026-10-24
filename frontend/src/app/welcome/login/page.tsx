'use client'

import { PublicOnly } from '@/components/guards'
import { Login } from '@/screens/welcome/Login'

export default function Page() {
  return (
    <PublicOnly>
      <Login />
    </PublicOnly>
  )
}
